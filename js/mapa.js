var geocoder;
var map;
var marker;
var bounds;
var service;
var directionsService;
var listaRotas = []; 
var listaMarcadores = [];
//icones
var iconTemporario;
var iconSalvo;
var iconNo;
var iconHub;


var lugares = [];
var matrizDistancia = [];
var iteracoesPorLinha;
var iteracao;
var numLinhas;
var linhaAtual;



function initialize() {
	//cordenada inicial (IFMG)
	var latlng = new google.maps.LatLng(-19.8950405, -43.79351650000001);
	var options = {
		zoom: 16,
		center: latlng,
		mapTypeId: google.maps.MapTypeId.ROADMAP //mapa de rodovias
	};
	
	//inicializa instancia do mapa e seleção de div
	map = new google.maps.Map(document.getElementById("mapa"), options);
	
	//inicializa localizador geográfico
	geocoder = new google.maps.Geocoder();

	//inicializa marcador do limite usado no mapa para zoom
	bounds = new google.maps.LatLngBounds();

	//inicializa serviço de Matriz de distancia
	service = new google.maps.DistanceMatrixService();

	//inicializa serviço para calculo de rotas para impressao
	directionsService = new google.maps.DirectionsService();

	iconHub = new google.maps.MarkerImage("img/icon_concentrador.png", null, null, new google.maps.Point(25, 50), new google.maps.Size(50, 50));
	iconNo = new google.maps.MarkerImage("img/icon_no.png", null, null, new google.maps.Point(25, 50), new google.maps.Size(50, 50));
	iconTemporario = new google.maps.MarkerImage("img/icon_base.png", null, null, new google.maps.Point(25, 50), new google.maps.Size(50, 50));
	iconSalvo = new google.maps.MarkerImage("img/icon_salvo.png", null, null, new google.maps.Point(25, 50), new google.maps.Size(50, 50));
	
	//inicializa marcador temporário de posição
	marker = new google.maps.Marker({
		map: map,
		draggable: true,
		icon: iconTemporario
	});
}


//adiciona um marcador a lista de marcadores do mapa
function adicionarMarcador(location, titulo) {
	marcador = new google.maps.Marker({
		position: location,
		map: map,
		title: titulo,
		icon: iconSalvo
	});
	return listaMarcadores.push(marcador) - 1;
}

//faz leitura de todos os marcadores e da zoom de modo que todos os narcadores apareçam
function fitMapa(){
	bounds = new google.maps.LatLngBounds();
	for(var i = 0; i < listaMarcadores.length; i++){
		if(listaMarcadores[i].getMap() != null){
			bounds.extend(listaMarcadores[i].getPosition());
		}		
	}
	map.fitBounds(bounds);
}


function sleep(milliseconds) {
	var start = new Date().getTime();
	while(true) {
		if ((new Date().getTime() - start) > milliseconds){
			break;
		}
	}
}

$(document).ready(function () {

	initialize(); //inicializa serviços do google maps
	
	//salva ponto no mapa através de endereço formatado
	function carregarNoMapa(endereco) {
		geocoder.geocode({ 'address': endereco + ', Brasil', 'region': 'BR' }, function (results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				if (results[0]) {
					var latitude = results[0].geometry.location.lat();
					var longitude = results[0].geometry.location.lng();
					var enderecoFormatado = results[0].formatted_address;
		
					$('#txtEndereco').val(enderecoFormatado);

					var location = new google.maps.LatLng(latitude, longitude);
					marker.setPosition(null);
					indice = adicionarMarcador(location, enderecoFormatado);

					$('#lugares-vazio').hide('fast');
                   	itemLista = '<span class="list-group-item"><a href="#" data-latitude="'+latitude+'" data-longitude="'+longitude+'" class="lista-lugares">'+results[0].formatted_address+'</a><a href="#" class="remover-lugar" data-indice="'+indice+'" data-latitude="'+latitude+'" data-longitude="'+longitude+'"><span class="icon-remover-lugar glyphicon glyphicon-remove-circle"></span></a></span>';
					$('#listLugares').append(itemLista);

					fitMapa();
				}
			}
		})
	}
	
	//carrega marcador definitivo de endereço após clicar em botão
	$("#btnEndereco").click(function() {
		if($("#txtEndereco").val() != ""){
			carregarNoMapa($("#txtEndereco").val());
		}			
	});
	

	$( ".list-group" ).on( "click",'.lista-lugares',function() {
		var latitude = $(this).data('latitude');
		var longitude = $(this).data('longitude');
		var location = new google.maps.LatLng(latitude, longitude);
		map.setCenter(location);
		map.setZoom(15);
		
	});

	$( ".list-group" ).on( "click",'.remover-lugar',function() {
		var latitude = $(this).data('latitude');
		var longitude = $(this).data('longitude');
		var indice = $(this).data('indice');
		console.log('apgando '+indice);
		listaMarcadores[indice].setMap(null);

		$(this).closest('.list-group-item').remove();
		
	});

	//envento de click para posicionar marcador temporário
	google.maps.event.addListener(map, 'click', function(event) {		
		geocoder.geocode({ 'latLng': event.latLng }, function (results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				if (results[0]) {
					marker.setPosition(event.latLng);
					$('#txtEndereco').val(results[0].formatted_address);
				}
			}
		});
	});
	
	//evento de arraste do marcador temporário
	google.maps.event.addListener(marker, 'drag', function () {
		geocoder.geocode({ 'latLng': marker.getPosition() }, function (results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				if (results[0]) {  
					$('#txtEndereco').val(results[0].formatted_address);
				}
			}
		});
	});

	//gera tabela de instâncias ao clicar em botão
	$('#btnGerarInstancia').click(function() {

		lugares = [];

		$('.lista-lugares').each(function() {
			lugares.push($(this).text());
		});

		service.getDistanceMatrix({
			origins: lugares,
			destinations: lugares,
			travelMode: google.maps.TravelMode.DRIVING,
			avoidHighways: false, //apenas rodovias
			avoidTolls: false //sem pedágios
		}, function callback(response, status) {
			if (status == google.maps.DistanceMatrixStatus.OK) {

				var tabela = $('#matrizDistancia');
				tabela.html('');

				var origens = response.originAddresses;
				var destinos = response.destinationAddresses;

				linhaLabels = $('<tr></tr>');
				linhaLabels.append('<th>Origem / Destino</th>');//celula diagonal branca

				for (var i = 0; i < destinos.length; i++) {
					linhaLabels.append('<th>'+destinos[i]+'</th>');
				}
				tabela.append(linhaLabels);

				for (var i = 0; i < origens.length; i++) {
					var results = response.rows[i].elements;
					linha = $('<tr></tr>').append('<th>'+origens[i]+'</th>');
					for (var j = 0; j < results.length; j++) {
						var elemento = results[j];
						var distancia = elemento.distance.text;
						var duracao = elemento.duration.text;
						var from = origens[i];
						var to = destinos[j];

						linha.append('<td>'+distancia+'</td>');
					}
					tabela.append(linha);
				}
			}
		});

	});

	$('#btnExemploSolucao').click(function(event) {
		gerarInstancia();
		$('#btnExemploLigacao').show('fast');
	});

	$('#btnExemploLigacao').click(function(event) {
		//gerarInstancia100();
		gerarLigacao();
	});

	function gerarInstancia(){
		var lugares = ["Campo Grande","Londrina","São José do Rio Preto","Cuiabá","Brasília","Goiânia","Governador Valadares","Vila Velha","Belo Horizonte"];
		
		for (var i = 0; i < lugares.length; i++) {
			$( carregarNoMapa(lugares[i]) ).delay( 1000 );
		};

		// Gerando matriz de distância
		service.getDistanceMatrix({
			origins: lugares,
			destinations: lugares,
			travelMode: google.maps.TravelMode.DRIVING,
			avoidHighways: false, //apenas rodovias -> False
			avoidTolls: false //sem pedágios -> False
		}, function callback(response, status) {
			if (status == google.maps.DistanceMatrixStatus.OK) {

				var tabela = $('#matrizDistancia');
				tabela.html('');

				var origens = response.originAddresses;
				var destinos = response.destinationAddresses;

				linhaLabels = $('<tr></tr>');
				linhaLabels.append('<th>Origem / Destino</th>');//celula diagonal branca

				for (var i = 0; i < destinos.length; i++) {
					linhaLabels.append('<th>'+destinos[i]+'</th>');
				}
				tabela.append(linhaLabels);

				for (var i = 0; i < origens.length; i++) {
					var results = response.rows[i].elements;
					linha = $('<tr></tr>').append('<th>'+origens[i]+'</th>');
					for (var j = 0; j < results.length; j++) {
						var elemento = results[j];
						var distancia = elemento.distance.text;
						var duracao = elemento.duration.text;
						var from = origens[i];
						var to = destinos[j];

						linha.append('<td>'+distancia+'</td>');
					}
					tabela.append(linha);
				}
			}
		});
	}

	$('#btnMuitosLugares').click(function(event) {
		gerarInstancia100();
	});

	function gerarInstancia100() {
		lugares = ["Santa Fé de Minas - MG",
		"Santa Helena de Minas - MG",
		"Santa Juliana - MG",
		"Santa Luzia - MG",
		"Santa Margarida - MG",
		"Santa Maria de Itabira - MG",
		"Santa Maria do Salto - MG",
		"Santa Maria do Suaçuí - MG",
		"Santana da Vargem - MG",
		"Santana de Cataguases - MG",
		"Santana de Pirapama - MG",
		"Santana do Deserto - MG",
		"Santana do Garambéu - MG",
		"Santana do Jacaré - MG",
		"Santana do Manhuaçu - MG",
		"Santana do Paraíso - MG",
		"Santana do Riacho - MG",
		"Santana dos Montes - MG",
		"Santa Rita de Caldas - MG",
		"Santa Rita de Jacutinga - MG",
		"Santa Rita de Minas - MG",
		"Santa Rita de Ibitipoca - MG",
		"Santa Rita do Itueto - MG",
		"Santa Rita do Sapucaí - MG",
		"Santa Rosa da Serra - MG",
		"Santa Vitória - MG",
		"Santo Antônio do Amparo - MG",
		"Santo Antônio do Aventureiro - MG",
		"Santo Antônio do Grama - MG",
		"Santo Antônio do Itambé - MG",
		"Santo Antônio do Jacinto - MG",
		"Santo Antônio do Monte - MG",
		"Santo Antônio do Retiro - MG",
		"Santo Antônio do Rio Abaixo - MG",
		"Santo Hipólito - MG",
		"Santos Dumont - MG",
		"São Bento Abade - MG",
		"São Brás do Suaçuí - MG",
		"São Domingos das Dores - MG",
		"São Domingos do Prata - MG",
		"São Félix de Minas - MG",
		"São Francisco - MG",
		"São Francisco de Paula - MG",
		"São Francisco de Sales - MG",
		"São Francisco do Glória - MG",
		"São Geraldo - MG",
		"São Geraldo da Piedade - MG",
		"São Geraldo do Baixio - MG",
		"São Gonçalo do Abaeté - MG",
		"São Gonçalo do Pará - MG",
		"São Gonçalo do Rio Abaixo - MG",
		"São Gonçalo do Sapucaí - MG",
		"São Gotardo - MG",
		"São João Batista do Glória - MG",
		"São João da Lagoa - MG",
		"São João da Mata - MG",
		"São João da Ponte - MG",
		"São João das Missões - MG",
		"São João del Rei - MG",
		"São João do Manhuaçu - MG",
		"São João do Manteninha - MG",
		"São João do Oriente - MG",
		"São João do Pacuí - MG",
		"São João do Paraíso - MG",
		"São João Evangelista - MG",
		"São João Nepomuceno - MG",
		"São Joaquim de Bicas - MG",
		"São José da Barra - MG",
		"São José da Lapa - MG",
		"São José da Safira - MG",
		"São José da Varginha - MG",
		"São José do Alegre - MG",
		"São José do Divino - MG",
		"São José do Goiabal - MG",
		"São José do Jacuri - MG",
		"São José do Mantimento - MG",
		"São Lourenço - MG",
		"São Miguel do Anta - MG",
		"São Pedro da União - MG",
		"São Pedro dos Ferros - MG",
		"São Pedro do Suaçuí - MG",
		"São Romão - MG",
		"São Roque de Minas - MG",
		"São Sebastião da Bela Vista - MG",
		"São Sebastião da Vargem Alegre - MG",
		"São Sebastião do Anta - MG",
		"São Sebastião do Maranhão - MG",
		"São Sebastião do Oeste - MG",
		"São Sebastião do Paraíso - MG",
		"São Sebastião do Rio Preto - MG",
		"São Sebastião do Rio Verde - MG",
		"São Tiago - MG",
		"São Tomás de Aquino - MG",
		"São Thomé das Letras - MG",
		"São Vicente de Minas - MG",
		"Sapucaí-Mirim - MG",
		"Sardoá - MG",
		"Sarzedo - MG",
		"Setubinha - MG",
		"Sem-Peixe - MG",
		"Senador Amaral - MG",
		"Senador Cortes - MG",
		"Senador Firmino - MG",
		"Senador José Bento - MG",
		"Senador Modestino Gonçalves - MG",
		"Senhora de Oliveira - MG",
		"Senhora do Porto - MG",
		"Senhora dos Remédios - MG",
		"Sericita - MG",
		"Seritinga - MG",
		"Serra Azul de Minas - MG",
		"Serra da Saudade - MG",
		"Serra dos Aimorés - MG",
		"Serra do Salitre - MG",
		"Serrania - MG",
		"Serranópolis de Minas - MG",
		"Serranos - MG",
		"Serro - MG",
		"Sete Lagoas - MG",
		"Silveirânia - MG",
		"Silvianópolis - MG",
		"Simão Pereira - MG",
		"Sobrália - MG",
		"Soledade de Minas - MG",
		"Tabuleiro - MG",
		"Taiobeiras - MG",
		"Taparuba - MG",
		"Tapira - MG",
		"Tapiraí - MG",
		"Taquaraçu de Minas - MG",
		"Tarumirim - MG",
		"Teixeiras - MG",
		"Teófilo Otoni - MG",
		"Timóteo - MG",
		"Tiradentes - MG",
		"Tiros - MG",
		"Tocantins - MG",
		"Tocos do Moji - MG",
		"Toledo - MG",
		"Tombos - MG",
		"Três Corações - MG",
		"Três Marias - MG",
		"Três Pontas - MG",
		"Tumiritinga - MG",
		"Tupaciguara - MG",
		"Turmalina - MG",
		"Turvolândia - MG",
		"Ubá - MG",
		"Ubaporanga - MG",
		"Uberlândia - MG",
		"Umburatiba - MG",
		"Unaí - MG",
		"União de Minas - MG",
		"Uruana de Minas - MG",
		"Urucânia - MG",
		"Urucuia - MG",
		"Vargem Alegre - MG",
		"Vargem Bonita - MG",
		"Vargem Grande do Rio Pardo - MG",
		"Varginha - MG",
		"Varjão de MInas - MG",
		"Várzea da Palma - MG",
		"Varzelândia - MG",
		"Vazante - MG",
		"Verdelândia - MG",
		"Veredinha - MG",
		"Veríssimo - MG",
		"Vermelho Novo - MG",
		"Vespasiano - MG",
		"Viçosa - MG",
		"Vieiras - MG",
		"Mathias Lobato - MG",
		"Virgem da Lapa - MG",
		"Virgínia - MG",
		"Virginópolis - MG",
		"Virgolândia - MG",
		"Visconde do Rio Branco - MG",
		"Volta Grande - MG",
		"Wenceslau Braz - MG",
		"Simonésia - MG",
		"Ibiraci - MG",
		"Machado - MG",
		"Uberaba - MG",
		"Ubaí - MG",
		"Confins - MG",
		"Rio Casca - MG",
		"Abadia dos Dourados - MG",
		"Abaeté - MG",
		"Abre Campo - MG",
		"Acaiaca - MG",
		"Açucena - MG",
		"Água Boa - MG",
		"Água Comprida - MG",
		"Aguanil - MG",
		"Águas Formosas - MG",
		"Águas Vermelhas - MG",
		"Aimorés - MG",
		"Aiuruoca - MG",
		"Alagoa - MG",
		"Albertina - MG",
		"Além Paraíba - MG",
		"Alfenas - MG",
		"Alfredo Vasconcelos - MG",
		"Almenara - MG",
		"Alpercata - MG",
		"Alpinópolis - MG",
		"Alterosa - MG",
		"Alto Caparaó - MG",
		"Alto Rio Doce - MG",
		"Alvarenga - MG",
		"Alvinópolis - MG",
		"Alvorada de Minas - MG",
		"Amparo do Serra - MG",
		"Andradas - MG",
		"Cachoeira de Pajeú - MG",
		"Andrelândia - MG",
		"Angelândia - MG",
		"Antônio Carlos - MG",
		"Antônio Dias - MG",
		"Antônio Prado de Minas - MG",
		"Araçaí - MG",
		"Aracitaba - MG",
		"Araçuaí - MG",
		"Araguari - MG",
		"Arantina - MG",
		"Araponga - MG",
		"Araporã - MG",
		"Arapuá - MG",
		"Araújos - MG",
		"Araxá - MG",
		"Arceburgo - MG",
		"Arcos - MG",
		"Areado - MG",
		"Argirita - MG",
		"Aricanduva - MG",
		"Arinos - MG",
		"Astolfo Dutra - MG",
		"Ataléia - MG",
		"Augusto de Lima - MG",
		"Baependi - MG",
		"Baldim - MG",
		"Bambuí - MG",
		"Bandeira - MG",
		"Bandeira do Sul - MG",
		"Barão de Cocais - MG",
		"Barão de Monte Alto - MG",
		"Barbacena - MG",
		"Barra Longa - MG",
		"Barroso - MG",
		"Bela Vista de Minas - MG",
		"Belmiro Braga - MG",
		"Belo Horizonte - MG",
		"Belo Oriente - MG",
		"Belo Vale - MG",
		"Berilo - MG",
		"Bertópolis - MG",
		"Berizal - MG",
		"Betim - MG",
		"Bias Fortes - MG",
		"Bicas - MG",
		"Biquinhas - MG",
		"Boa Esperança - MG",
		"Bocaina de Minas - MG",
		"Bocaiúva - MG",
		"Bom Despacho - MG",
		"Bom Jardim de Minas - MG",
		"Bom Jesus da Penha - MG",
		"Bom Jesus do Amparo - MG",
		"Bom Jesus do Galho - MG",
		"Bom Repouso - MG",
		"Bom Sucesso - MG",
		"Bonfim - MG",
		"Bonfinópolis de Minas - MG",
		"Bonito de Minas - MG",
		"Borda da Mata - MG",
		"Botelhos - MG",
		"Botumirim - MG",
		"Brasilândia de Minas - MG",
		"Brasília de Minas - MG",
		"Brás Pires - MG",
		"Braúnas - MG",
		"Brasópolis - MG",
		"Brumadinho - MG",
		"Bueno Brandão - MG",
		"Buenópolis - MG",
		"Bugre - MG",
		"Buritis - MG",
		"Buritizeiro - MG",
		"Cabeceira Grande - MG",
		"Cabo Verde - MG",
		"Cachoeira da Prata - MG",
		"Cachoeira de Minas - MG",
		"Cachoeira Dourada - MG",
		"Caetanópolis - MG",
		"Caeté - MG",
		"Caiana - MG",
		"Cajuri - MG",
		"Caldas - MG",
		"Camacho - MG",
		"Camanducaia - MG",
		"Cambuí - MG",
		"Cambuquira - MG",
		"Campanário - MG",
		"Campanha - MG",
		"Campestre - MG",
		"Campina Verde - MG",
		"Campo Azul - MG",
		"Campo Belo - MG",
		"Campo do Meio - MG",
		"Campo Florido - MG",
		"Campos Altos - MG",
		"Campos Gerais - MG",
		"Canaã - MG",
		"Canápolis - MG",
		"Cana Verde - MG",
		"Candeias - MG",
		"Cantagalo - MG",
		"Caparaó - MG",
		"Capela Nova - MG",
		"Capelinha - MG",
		"Capetinga - MG",
		"Capim Branco - MG",
		"Capinópolis - MG",
		"Capitão Andrade - MG",
		"Capitão Enéas - MG",
		"Capitólio - MG",
		"Caputira - MG",
		"Caraí - MG",
		"Caranaíba - MG",
		"Carandaí - MG",
		"Carangola - MG",
		"Caratinga - MG",
		"Carbonita - MG",
		"Careaçu - MG",
		"Carlos Chagas - MG",
		"Carmésia - MG",
		"Carmo da Cachoeira - MG",
		"Carmo da Mata - MG",
		"Carmo de Minas - MG",
		"Carmo do Cajuru - MG",
		"Carmo do Paranaíba - MG",
		"Carmo do Rio Claro - MG",
		"Carmópolis de Minas - MG",
		"Carneirinho - MG",
		"Carrancas - MG",
		"Carvalhos - MG",
		"Casa Grande - MG",
		"Cascalho Rico - MG",
		"Conceição da Barra de Minas - MG",
		"Cataguases - MG",
		"Catas Altas - MG",
		"Catas Altas da Noruega - MG",
		"Catuji - MG",
		"Catuti - MG",
		"Caxambu - MG",
		"Cedro do Abaeté - MG",
		"Central de Minas - MG",
		"Centralina - MG",
		"Chácara - MG",
		"Chalé - MG",
		"Chapada do Norte - MG",
		"Chapada Gaúcha - MG",
		"Chiador - MG",
		"Cipotânea - MG",
		"Claraval - MG",
		"Claro dos Poções - MG",
		"Cláudio - MG",
		"Coimbra - MG",
		"Coluna - MG",
		"Comendador Gomes - MG",
		"Comercinho - MG",
		"Conceição da Aparecida - MG",
		"Conceição das Pedras - MG",
		"Conceição das Alagoas - MG",
		"Conceição de Ipanema - MG",
		"Conceição do Mato Dentro - MG",
		"Conceição do Pará - MG",
		"Conceição do Rio Verde - MG",
		"Conceição dos Ouros - MG",
		"Cônego Marinho - MG",
		"Congonhal - MG",
		"Congonhas - MG",
		"Congonhas do Norte - MG",
		"Conquista - MG",
		"Conselheiro Lafaiete - MG",
		"Conselheiro Pena - MG",
		"Consolação - MG",
		"Contagem - MG",
		"Coqueiral - MG",
		"Coração de Jesus - MG",
		"Cordisburgo - MG",
		"Cordislândia - MG",
		"Corinto - MG",
		"Coroaci - MG",
		"Coromandel - MG",
		"Coronel Fabriciano - MG",
		"Coronel Murta - MG",
		"Coronel Pacheco - MG",
		"Coronel Xavier Chaves - MG",
		"Córrego Danta - MG",
		"Córrego do Bom Jesus - MG",
		"Córrego Fundo - MG",
		"Córrego Novo - MG",
		"Couto de Magalhães de Minas - MG",
		"Crisólita - MG",
		"Cristais - MG",
		"Cristália - MG",
		"Cristiano Otoni - MG",
		"Cristina - MG",
		"Crucilândia - MG",
		"Cruzeiro da Fortaleza - MG",
		"Cruzília - MG",
		"Cuparaque - MG",
		"Curral de Dentro - MG",
		"Curvelo - MG",
		"Datas - MG",
		"Delfim Moreira - MG",
		"Delfinópolis - MG",
		"Delta - MG",
		"Descoberto - MG",
		"Desterro de Entre Rios - MG",
		"Desterro do Melo - MG",
		"Diamantina - MG",
		"Diogo de Vasconcelos - MG",
		"Dionísio - MG",
		"Divinésia - MG",
		"Divino - MG",
		"Divino das Laranjeiras - MG",
		"Divinolândia de Minas - MG",
		"Divinópolis - MG",
		"Divisa Alegre - MG",
		"Divisa Nova - MG",
		"Divisópolis - MG",
		"Dom Bosco - MG",
		"Dom Cavati - MG",
		"Dom Joaquim - MG",
		"Dom Silvério - MG",
		"Dom Viçoso - MG",
		"Dona Eusébia - MG",
		"Dores de Campos - MG",
		"Dores de Guanhães - MG",
		"Dores do Indaiá - MG",
		"Dores do Turvo - MG",
		"Doresópolis - MG",
		"Douradoquara - MG",
		"Durandé - MG",
		"Elói Mendes - MG",
		"Engenheiro Caldas - MG",
		"Engenheiro Navarro - MG",
		"Entre Folhas - MG",
		"Entre Rios de Minas - MG",
		"Ervália - MG",
		"Esmeraldas - MG",
		"Espera Feliz - MG",
		"Espinosa - MG",
		"Espírito Santo do Dourado - MG",
		"Estiva - MG",
		"Estrela Dalva - MG",
		"Estrela do Indaiá - MG",
		"Estrela do Sul - MG",
		"Eugenópolis - MG",
		"Ewbank da Câmara - MG",
		"Extrema - MG",
		"Fama - MG",
		"Faria Lemos - MG",
		"Felício dos Santos - MG",
		"São Gonçalo do Rio Preto - MG",
		"Felisburgo - MG",
		"Felixlândia - MG",
		"Fernandes Tourinho - MG",
		"Ferros - MG",
		"Fervedouro - MG",
		"Florestal - MG",
		"Formiga - MG",
		"Formoso - MG",
		"Fortaleza de Minas - MG",
		"Fortuna de Minas - MG",
		"Francisco Badaró - MG",
		"Francisco Dumont - MG",
		"Francisco Sá - MG",
		"Franciscópolis - MG",
		"Frei Gaspar - MG",
		"Frei Inocêncio - MG",
		"Frei Lagonegro - MG",
		"Fronteira - MG",
		"Fronteira dos Vales - MG",
		"Fruta de Leite - MG",
		"Frutal - MG",
		"Funilândia - MG",
		"Galiléia - MG",
		"Gameleiras - MG",
		"Glaucilândia - MG",
		"Goiabeira - MG",
		"Goianá - MG",
		"Gonçalves - MG",
		"Gonzaga - MG",
		"Gouveia - MG",
		"Governador Valadares - MG",
		"Grão Mogol - MG",
		"Grupiara - MG",
		"Guanhães - MG",
		"Guapé - MG",
		"Guaraciaba - MG",
		"Guaraciama - MG",
		"Guaranésia - MG",
		"Guarani - MG",
		"Guarará - MG",
		"Guarda-Mor - MG",
		"Guaxupé - MG",
		"Guidoval - MG",
		"Guimarânia - MG",
		"Guiricema - MG",
		"Gurinhatã - MG",
		"Heliodora - MG",
		"Iapu - MG",
		"Ibertioga - MG",
		"Ibiá - MG",
		"Ibiaí - MG",
		"Ibiracatu - MG",
		"Cássia - MG",
		"Ibirité - MG",
		"Ibitiúra de Minas - MG",
		"Ibituruna - MG",
		"Icaraí de Minas - MG",
		"Igarapé - MG",
		"Igaratinga - MG",
		"Iguatama - MG",
		"Ijaci - MG",
		"Ilicínea - MG",
		"Imbé de Minas - MG",
		"Inconfidentes - MG",
		"Indaiabira - MG",
		"Indianópolis - MG",
		"Ingaí - MG",
		"Inhapim - MG",
		"Inhaúma - MG",
		"Inimutaba - MG",
		"Ipaba - MG",
		"Ipanema - MG",
		"Ipatinga - MG",
		"Ipiaçu - MG",
		"Ipuiúna - MG",
		"Iraí de Minas - MG",
		"Itabira - MG",
		"Itabirinha de Mantena - MG",
		"Itabirito - MG",
		"Itacambira - MG",
		"Itacarambi - MG",
		"Itaguara - MG",
		"Itaipé - MG",
		"Itajubá - MG",
		"Itamarandiba - MG",
		"Itamarati de Minas - MG",
		"Itambacuri - MG",
		"Itambé do Mato Dentro - MG",
		"Itamogi - MG",
		"Itamonte - MG",
		"Itanhandu - MG",
		"Itanhomi - MG",
		"Itaobim - MG",
		"Itapagipe - MG",
		"Itapecerica - MG",
		"Itapeva - MG",
		"Itatiaiuçu - MG",
		"Itaú de Minas - MG",
		"Itaúna - MG",
		"Itaverava - MG",
		"Itinga - MG",
		"Itueta - MG",
		"Ituiutaba - MG",
		"Itumirim - MG",
		"Iturama - MG",
		"Itutinga - MG",
		"Jaboticatubas - MG",
		"Jacinto - MG",
		"Jacuí - MG",
		"Jacutinga - MG",
		"Jaguaraçu - MG",
		"Jaíba - MG",
		"Jampruca - MG",
		"Janaúba - MG",
		"Januária - MG",
		"Japaraíba - MG",
		"Japonvar - MG",
		"Jeceaba - MG",
		"Jenipapo de Minas - MG",
		"Jequeri - MG",
		"Jequitaí - MG",
		"Jequitibá - MG",
		"Jequitinhonha - MG",
		"Jesuânia - MG",
		"Joaíma - MG",
		"Joanésia - MG",
		"João Monlevade - MG",
		"João Pinheiro - MG",
		"Joaquim Felício - MG",
		"Jordânia - MG",
		"José Gonçalves de Minas - MG",
		"José Raydan - MG",
		"Josenópolis - MG",
		"Nova União - MG",
		"Juatuba - MG",
		"Juiz de Fora - MG",
		"Juramento - MG",
		"Juruaia - MG",
		"Juvenília - MG",
		"Ladainha - MG",
		"Lagamar - MG",
		"Lagoa da Prata - MG",
		"Lagoa dos Patos - MG",
		"Lagoa Dourada - MG",
		"Lagoa Formosa - MG",
		"Lagoa Grande - MG",
		"Lagoa Santa - MG",
		"Lajinha - MG",
		"Lambari - MG",
		"Lamim - MG",
		"Laranjal - MG",
		"Lassance - MG",
		"Lavras - MG",
		"Leandro Ferreira - MG",
		"Leme do Prado - MG",
		"Leopoldina - MG",
		"Liberdade - MG",
		"Lima Duarte - MG",
		"Limeira do Oeste - MG",
		"Lontra - MG",
		"Luisburgo - MG",
		"Luislândia - MG",
		"Luminárias - MG",
		"Luz - MG",
		"Machacalis - MG",
		"Carvalhópolis - MG",
		"Madre de Deus de Minas - MG",
		"Malacacheta - MG",
		"Mamonas - MG",
		"Manga - MG",
		"Manhuaçu - MG",
		"Manhumirim - MG",
		"Mantena - MG",
		"Maravilhas - MG",
		"Mar de Espanha - MG",
		"Maria da Fé - MG",
		"Mariana - MG",
		"Marilac - MG",
		"Mário Campos - MG",
		"Maripá de Minas - MG",
		"Marliéria - MG",
		"Marmelópolis - MG",
		"Martinho Campos - MG",
		"Martins Soares - MG",
		"Mata Verde - MG",
		"Materlândia - MG",
		"Mateus Leme - MG",
		"Matias Barbosa - MG",
		"Matias Cardoso - MG",
		"Matipó - MG",
		"Mato Verde - MG",
		"Matozinhos - MG",
		"Matutina - MG",
		"Medeiros - MG",
		"Medina - MG",
		"Mendes Pimentel - MG",
		"Mercês - MG",
		"Mesquita - MG",
		"Minas Novas - MG",
		"Minduri - MG",
		"Mirabela - MG",
		"Miradouro - MG",
		"Miraí - MG",
		"Miravânia - MG",
		"Moeda - MG",
		"Moema - MG",
		"Monjolos - MG",
		"Monsenhor Paulo - MG",
		"Montalvânia - MG",
		"Monte Alegre de Minas - MG",
		"Monte Azul - MG",
		"Monte Belo - MG",
		"Monte Carmelo - MG",
		"Monte Formoso - MG",
		"Monte Santo de Minas - MG",
		"Montes Claros - MG",
		"Monte Sião - MG",
		"Montezuma - MG",
		"Morada Nova de Minas - MG",
		"Morro da Garça - MG",
		"Morro do Pilar - MG",
		"Munhoz - MG",
		"Muriaé - MG",
		"Mutum - MG",
		"Muzambinho - MG",
		"Nacip Raydan - MG",
		"Nanuque - MG",
		"Naque - MG",
		"Natalândia - MG",
		"Natércia - MG",
		"Nazareno - MG",
		"Nepomuceno - MG",
		"Ninheira - MG",
		"Nova Belém - MG",
		"Nova Era - MG",
		"Nova Lima - MG",
		"Nova Módica - MG",
		"Nova Ponte - MG",
		"Nova Porteirinha - MG",
		"Nova Resende - MG",
		"Nova Serrana - MG",
		"Novo Cruzeiro - MG",
		"Novo Oriente de Minas - MG",
		"Novorizonte - MG",
		"Olaria - MG",
		"Olhos-d'Água - MG",
		"Olímpio Noronha - MG",
		"Oliveira - MG",
		"Oliveira Fortes - MG",
		"Onça de Pitangui - MG",
		"Oratórios - MG",
		"Orizânia - MG",
		"Ouro Branco - MG",
		"Ouro Fino - MG",
		"Ouro Preto - MG",
		"Ouro Verde de Minas - MG",
		"Padre Carvalho - MG",
		"Padre Paraíso - MG",
		"Paineiras - MG",
		"Pains - MG",
		"Pai Pedro - MG",
		"Paiva - MG",
		"Palma - MG",
		"Palmópolis - MG",
		"Papagaios - MG",
		"Paracatu - MG",
		"Pará de Minas - MG",
		"Paraguaçu - MG",
		"Paraisópolis - MG",
		"Paraopeba - MG",
		"Passabém - MG",
		"Passa Quatro - MG",
		"Passa Tempo - MG",
		"Passa-Vinte - MG",
		"Passos - MG",
		"Patis - MG",
		"Patos de Minas - MG",
		"Patrocínio - MG",
		"Patrocínio do Muriaé - MG",
		"Paula Cândido - MG",
		"Paulistas - MG",
		"Pavão - MG",
		"Peçanha - MG",
		"Pedra Azul - MG",
		"Pedra Bonita - MG",
		"Pedra do Anta - MG",
		"Pedra do Indaiá - MG",
		"Pedra Dourada - MG",
		"Pedralva - MG",
		"Pedras de Maria da Cruz - MG",
		"Pedrinópolis - MG",
		"Pedro Leopoldo - MG",
		"Pedro Teixeira - MG",
		"Pequeri - MG",
		"Pequi - MG",
		"Perdigão - MG",
		"Perdizes - MG",
		"Perdões - MG",
		"Periquito - MG",
		"Pescador - MG",
		"Piau - MG",
		"Piedade de Caratinga - MG",
		"Piedade de Ponte Nova - MG",
		"Piedade do Rio Grande - MG",
		"Piedade dos Gerais - MG",
		"Pimenta - MG",
		"Pingo-d'Água - MG",
		"Pintópolis - MG",
		"Piracema - MG",
		"Pirajuba - MG",
		"Piranga - MG",
		"Piranguçu - MG",
		"Piranguinho - MG",
		"Pirapetinga - MG",
		"Pirapora - MG",
		"Piraúba - MG",
		"Pitangui - MG",
		"Piumhi - MG",
		"Planura - MG",
		"Poço Fundo - MG",
		"Poços de Caldas - MG",
		"Pocrane - MG",
		"Pompéu - MG",
		"Ponte Nova - MG",
		"Ponto Chique - MG",
		"Ponto dos Volantes - MG",
		"Porteirinha - MG",
		"Porto Firme - MG",
		"Poté - MG",
		"Pouso Alegre - MG",
		"Pouso Alto - MG",
		"Prados - MG",
		"Prata - MG",
		"Pratápolis - MG",
		"Pratinha - MG",
		"Presidente Bernardes - MG",
		"Presidente Juscelino - MG",
		"Presidente Kubitschek - MG",
		"Presidente Olegário - MG",
		"Alto Jequitibá - MG",
		"Prudente de Morais - MG",
		"Quartel Geral - MG",
		"Queluzito - MG",
		"Raposos - MG",
		"Raul Soares - MG",
		"Recreio - MG",
		"Reduto - MG",
		"Resende Costa - MG",
		"Resplendor - MG",
		"Ressaquinha - MG",
		"Riachinho - MG",
		"Riacho dos Machados - MG",
		"Ribeirão das Neves - MG",
		"Ribeirão Vermelho - MG",
		"Rio Acima - MG",
		"Rio Doce - MG",
		"Rio do Prado - MG",
		"Rio Espera - MG",
		"Rio Manso - MG",
		"Rio Novo - MG",
		"Rio Paranaíba - MG",
		"Rio Pardo de Minas - MG",
		"Rio Piracicaba - MG",
		"Rio Pomba - MG",
		"Rio Preto - MG",
		"Rio Vermelho - MG",
		"Ritápolis - MG",
		"Rochedo de Minas - MG",
		"Rodeiro - MG",
		"Romaria - MG",
		"Rosário da Limeira - MG",
		"Rubelita - MG",
		"Rubim - MG",
		"Sabará - MG",
		"Sabinópolis - MG",
		"Sacramento - MG",
		"Salinas - MG",
		"Salto da Divisa - MG",
		"Santa Bárbara - MG",
		"Santa Bárbara do Leste - MG",
		"Santa Bárbara do Monte Verde - MG",
		"Santa Bárbara do Tugúrio - MG",
		"Santa Cruz de Minas - MG",
		"Santa Cruz de Salinas - MG",
		"Santa Cruz do Escalvado - MG",
		"Santa Efigênia de Minas - MG"];

		var tabela = $('#matrizDistancia');
		tabela.html('');

		linhaLabels = $('<tr></tr>');
		linhaLabels.append('<th>Origem / Destino</th>');//celula diagonal branca
		for (var i = 0; i < lugares.length; i++) {
			linhaLabels.append('<th>'+lugares[i]+'</th>');
		}
		tabela.append(linhaLabels);

		matrizDistancia = new Array( numLinhas );
		numLinhas = lugares.length;
		iteracoesPorLinha = Math.ceil( numLinhas / 25 ); //25 ites por cada chamada
		iteracao = 0;
		linhaAtual = 0;
		linha_parar = linhaAtual+3;

		async.whilst(
			function () { return linhaAtual < numLinhas; },
			function(callback){	
				getMatrizDistancia(callback);
			},
			function (err) {
        		console.log("Erro: "+err);
    		}
    	);

	}

	function getMatrizDistancia(callback){

		var origem 	= 	[ lugares[linhaAtual] ];
		var colini 	= 	25*iteracao;
		var colfim 	=  	Math.min( 25*iteracao+25, lugares.length);
		var destino = 	lugares.slice(colini, colfim);
		var service = 	new google.maps.DistanceMatrixService();
		service.getDistanceMatrix({
			origins: origem,
			destinations: destino,
			travelMode: google.maps.TravelMode.DRIVING,
			avoidHighways: false, //apenas rodovias -> False
			avoidTolls: false //sem pedágios -> False
		}, function (response, status) {
			if (status === google.maps.DistanceMatrixStatus.OK) {

				if( iteracao === 0 ){//inicio da linha
					var linhaTabela = $('<tr class="linha-'+linhaAtual+'"></tr>').append('<th>'+lugares[linhaAtual]+'</th>');
					$('#matrizDistancia').append(linhaTabela);
					matrizDistancia[linhaAtual] = [];
				}

				//var origens = response.originAddresses;
				//var destinos = response.destinationAddresses;

				var results = response.rows[0].elements;
				for (var j = 0; j < results.length; j++) {
					var elemento = results[j];
					var dist = elemento.distance.value;

					matrizDistancia[linhaAtual].push(dist);
					$('.linha-'+linhaAtual).append('<td>'+dist+'</td>');
				}				

				iteracao++; //proxima iteracao
				if(iteracao >= iteracoesPorLinha){
					iteracao = 0;
					linhaAtual++;
				}
				callback();


			}else if (status === google.maps.DistanceMatrixStatus.OVER_QUERY_LIMIT) {    
	            var tempoRand = Math.floor((Math.random() * 1000) + 1000);
	            setTimeout(function() {
	                callback();
	            }, tempoRand);
	        }
		});		
	}

	function gerarLigacao(){		
		var hubs = [ 2, 5, 8 ];
		var alocacao = [ 2, 2, 2, 5, 5, 5, 8, 8, 8 ];

		for (var i = 0; i < listaMarcadores.length; i++) {
			listaMarcadores[i].setIcon(iconNo);
		};

		for(var i = 0; i < hubs.length; i++){

			listaMarcadores[ hubs[i] ].setIcon(iconHub);

			for (var j = i+1; j < hubs.length; j++) {
				criarLicacao( listaMarcadores[ hubs[i] ].getPosition(), listaMarcadores[ hubs[j] ].getPosition() );
			}
		}

		for (var i = 0; i < alocacao.length; i++) {
			if(alocacao[i] != i){
				criarLicacao( listaMarcadores[i].getPosition(), listaMarcadores[ alocacao[i] ].getPosition() );
			}
		};
	}

	function criarRota(origem, destino){
		var directionsDisplay = new google.maps.DirectionsRenderer({suppressMarkers: true});
		var directionsService = new google.maps.DirectionsService();
		directionsDisplay.setMap(map);
		var request = {
			origin: origem,
			destination: destino,
			travelMode: google.maps.TravelMode.DRIVING
		};
		directionsService.route(request, function(result, status) {
			if (status == google.maps.DirectionsStatus.OK) {
				directionsDisplay.setDirections(result);
			}
		});
		//rotas.push(directionsDisplay);
	}

	function criarLicacao(origem, destino){

		cordenadas = [origem, destino];

		var ligacao = new google.maps.Polyline({
			path: cordenadas,
			geodesic: true,
			strokeColor: '#FF0000',
			strokeOpacity: 0.8,
			strokeWeight: 2
		});

		ligacao.setMap(map);

	}

	$('#btnGerarRota').click(function() {
		var hubs = [2, 3];
		var alocacao = [ 2, 2, 2, 3, 3, 3 ];

		for (var i = 0; i < listaMarcadores.length; i++) {
			listaMarcadores[i].setIcon(iconNo);
		};

		for(var i = 0; i < hubs.length; i++){

			listaMarcadores[ hubs[i] ].setIcon(iconHub);

			for (var j = i+1; j < hubs.length; j++) {
				criarRota( listaMarcadores[ hubs[i] ].getPosition(), listaMarcadores[ hubs[j] ].getPosition() );
			}
		}

		for (var i = 0; i < alocacao.length; i++) {
			if(alocacao[i] != i){
				criarRota( listaMarcadores[i].getPosition(), listaMarcadores[ alocacao[i] ].getPosition() );
			}
		};
	});

	//auto complete em endereço digitado
	$("#txtEndereco").autocomplete({
		source: function (request, response) {
			geocoder.geocode({ 'address': request.term + ', Brasil', 'region': 'BR' }, function (results, status) {
				response($.map(results, function (item) {
					return {
						label: item.formatted_address,
						value: item.formatted_address,
						latitude: item.geometry.location.lat(),
						longitude: item.geometry.location.lng()
					}
				}));
			});
		},
		select: function (event, ui) {
			var location = new google.maps.LatLng(ui.item.latitude, ui.item.longitude);
			marker.setPosition(location);
			map.setCenter(location);
			map.setZoom(15);
		}
	});
	
	$("form").submit(function(event) {
		event.preventDefault();
	});
});