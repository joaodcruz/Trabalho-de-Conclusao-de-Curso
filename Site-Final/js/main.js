$(function() {
    $.datepicker.regional['pt-BR'] = {
        closeText: 'Fechar',
        prevText: '&#x3C;Anterior',
        nextText: 'Próximo&#x3E;',
        currentText: 'Hoje',
        monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
        monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
        dayNames: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
        dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
        dayNamesMin: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
        weekHeader: 'Sm',
        dateFormat: 'dd/mm/yy',
        firstDay: 0,
        isRTL: false,
        showMonthAfterYear: false,
        yearSuffix: ''
    };
    $.datepicker.setDefaults($.datepicker.regional['pt-BR']);

    var currentDate = new Date();
    var oneYearAgo = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), currentDate.getDate());

    $("#start").datepicker({
        maxDate: '0',
        minDate: oneYearAgo,
    });

    $.datepicker.setDefaults($.datepicker.regional["pt-BR"]);
});



let map = L.map("mymap").setView([-23.325488, -51.201958], 14);
let ourData = [];

// Adição da camada de azulejos OpenStreetMap ao mapa
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 20,
    minZoom: 2,
    tileSize: 512,
    zoomOffset: -1,
}).addTo(map);

// Opções do ícone personalizado para o mapa
let iconOption = {
    iconUrl: "./img/marcador.png",
    iconSize: [30, 30],
};
let ourCustomIcon = L.icon(iconOption);

// Autenticação do usuário e manipulação dos dados
auth.signInWithEmailAndPassword('joao.victor.cruz@uel.br', 'hidro1234').then((userCredential) => {
    
    // Usuário autenticado
    const user = userCredential.user;
    uid = user.uid;

    // Busca dos dados de localização a partir do arquivo JSON
    fetch("./data/location-data.json")
    .then(response => response.json())
    .then(data => {
        ourData = data;

        // Loop através dos dados para criar marcadores no mapa
        for (let i = 0; i < data.length; i++) {
            let nome = data[i].nome;
            let longitude = data[i].Longitude;
            let latitude = data[i].Latitude;

             // Objeto para manipular os dados e criar marcadores no mapa
            let PLOTMAP = {
                'dbPath': db.ref(`/${uid}/${nome}/${nome}/Dados/`),
                'fixosPath': db.ref(`/${uid}/${nome}/`),
                'Fluxo': '',
                'Tempo': '',

                // Função para ler dados do banco de dados em tempo real
                'lerDados': function () {
                    this.dbPath.orderByKey().limitToLast(1).on('child_added', snapshot => {
                        let dadosJson = snapshot.toJSON();
                        this.Fluxo = dadosJson.Fluxo;
                        this.Tempo = dadosJson.Tempo;
                        this.pinMap();
                    })
                },
                'Taxa': '',
                'nome': '',

                // Função para ler configurações do banco de dados em tempo real
                'lerSetup': function () {
                    this.fixosPath.orderByKey().limitToLast(1).on('child_added', snapshot => {
                        let dadosJson = snapshot.toJSON();
                        this.Taxa = dadosJson.Taxa;
                        this.nome = dadosJson.nome;
                    })
                },

                // Função para abrir o mapa e adicionar o marcador
                'pinMap': function () {
                    const date = new Date(this.Tempo * 1000);
                    const dia = date.getDate().toString().padStart(2, '0');
                    const mes = (date.getMonth() + 1).toString().padStart(2, '0');
                    const ano = date.getFullYear();
                    const hora = date.getHours().toString().padStart(2, '0');
                    const minuto = date.getMinutes().toString().padStart(2, '0');
                    const segundo = date.getSeconds().toString().padStart(2, '0');
                    const dataHoraBrasilia = `${dia}/${mes}/${ano} ${hora}:${minuto}:${segundo}`;

                    // Verifique se o marcador existe
                    if (this.marker) {
                        
                         // Atualize o conteúdo do pop-up do marcador
                        this.marker.setPopupContent(
                            `<h3> ${nome} </h3> <p> ${'Fluxo: '}${this.Fluxo} ${'L/m'} </p> <p> ${dataHoraBrasilia}</p>`
                        );
                    } else {
                        // Se o marcador ainda não existir, crie um novo marcador e adicione ao mapa
                        this.marker = L.marker([latitude, longitude], {
                            icon: ourCustomIcon,
                        })
                        .bindPopup(
                            `<h3> ${nome} </h3> <p> ${'Fluxo: '}${this.Fluxo} ${'L/m'} </p> <p> ${dataHoraBrasilia}</p>`
                        )
                        .addTo(map);
                    }
                },                

                // Evento de clique para plotar o gráfico para o sensor selecionado no dropdown
                'plotChart': async function () {
                    let isProcessing = false; // Flag para evitar execuções simultâneas
                    let eventAdded = false; // Flag para controlar se o evento já foi adicionado
                
                    async function clickHandler() {
                        if (isProcessing) {
                            return; // Se já estiver processando, saia
                        }
                
                        isProcessing = true; // Marque como processando
                
                        try {
                            let mymap = document.getElementById("mymap");
                            if (mymap.style.display == "none") {
                                let select = document.querySelector(".select-dropdown");
                                let value = select.options[select.selectedIndex].value;
                                let nomeChart = ourData[value - 1].nome;
                
                                let dataInicio = document.getElementById('start').value;
                                let partsInicio = dataInicio.split('/');
                
                                let inicioSplit = new Date(partsInicio[2], partsInicio[1] - 1, partsInicio[0]);
                
                                let TSdataInicio = inicioSplit.getTime() / 1000;
                
                                let chartFluxo = [];
                                let chartConsumo = [];
                                let labels = [];

                                let somaConsumo = 0;
                
                                // Consulta direta ao Firebase apenas para os dados relevantes
                                for (let aux = 0; aux < 144; aux++) {            
                                    let correMin = TSdataInicio + (aux * 600);
                                    let snapshot = await db.ref(`/${uid}/${nomeChart}/${nomeChart}/Dados`).orderByKey().startAt(correMin.toString()).endAt((correMin + 599).toString()).once('value');
                                    let dadosChart = snapshot.val();
                
                                    let somaFluxo = 0;
                                    let count = 0;
                
                                    // Calculando a soma dos valores diferentes de zero para o dia
                                    for (let key in dadosChart) {
                                        if (dadosChart[key] && dadosChart[key].Tempo && dadosChart[key].Fluxo !== undefined && dadosChart[key].Fluxo !== 0) {
                                            let fbFluxo = dadosChart[key].Fluxo;
                                            somaFluxo += fbFluxo;
                                            count++;
                                        }
                                    }
                
                                    // Calculando a média do fluxo de 10 em 10 minutos
                                    let mediaFluxo = count > 0 ? somaFluxo / count : 0;
                                    somaConsumo = somaConsumo + (mediaFluxo * 10);
                                    chartFluxo.push(mediaFluxo);
                                    chartConsumo.push(somaConsumo);
                
                                    // Obtendo a data no formato dd/mm/aa (com dois últimos dígitos do ano)
                                    let data = new Date(correMin * 1000);
                                    let horaFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                    labels.push(horaFormatada);
                                }
                                
                                console.log(chartFluxo);
                                // Destruindo o gráfico anterior, se existir
                                if (window.myChart) {
                                    window.myChart.destroy();
                                }
                
                                // Obtendo o canvas onde o gráfico será desenhado
                                let canvas = document.getElementById('mychartcanv');
                                let ctx = canvas.getContext('2d');
                
                                // Criando o gráfico de barras
                                window.myChart = new Chart(ctx, {
                                    type: 'line',
                                    data: {
                                        labels: labels, // Adicione as datas formatadas aqui (dd/mm/aa)
                                        datasets: [{
                                            label: 'Fluxo', // Rótulo do conjunto de dados
                                            data: chartFluxo, // Dados do fluxo médio para cada dia
                                            backgroundColor: 'rgba(56, 167, 167, 1)', // Cor de fundo das barras
                                            pointStyle: false,
                                            borderColor: 'rgba(56, 167, 167, 1)', // Cor da borda das barras
                                            borderWidth: 3 // Largura da borda das barras
                                        }, {
                                            label: 'Consumo', // Rótulo do conjunto de dados
                                            data: chartConsumo, // Dados do fluxo médio para cada dia
                                            backgroundColor: 'rgba(165, 42, 42, 1)', // Cor de fundo das barras
                                            pointStyle: false,
                                            borderColor: 'rgba(165, 42, 42, 1)', // Cor da borda das barras
                                            borderWidth: 3 // Largura da borda das barras
                                        }]
                                    },
                                    options: {
                                        scales: {
                                            y: {
                                                beginAtZero: true // Começa o eixo y a partir de zero
                                            }
                                        }
                                    }
                                });
                
                                // Atualizando o gráfico
                                window.myChart.update();
                            }
                        } catch (error) {
                            console.error('Erro ao obter dados do Firebase:', error);
                        } finally {
                            isProcessing = false; // Marque como não processando
                        }
                    }
                
                    // Adicione o listener de evento apenas se ainda não foi adicionado
                    if (!eventAdded) {
                        // Adicione o listener de evento
                        document.querySelector(".search-btn").addEventListener("click", clickHandler);
                        eventAdded = true; // Marque o evento como adicionado
                    }
                }
                
            }
            
            PLOTMAP.lerSetup();
            PLOTMAP.lerDados();
            //setTimeout(() => {
            PLOTMAP.pinMap();
            //}, 1000);
            PLOTMAP.plotChart();
        }

    })
    .catch(error => {
        console.error('Ocorreu um erro ao ler o arquivo JSON:', error);
    });
})
.catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
});

let uid;

function showMap() {
    var mymap = document.getElementById("mymap");
    var mychartcanv = document.getElementById("mychartcanv");
    var daterange = document.getElementById("daterange");

    mymap.style.display = "block";
    mychartcanv.style.display = "none";
    daterange.style.display = "none";
}

function showChart() {
    var mymap = document.getElementById("mymap");
    var mychartcanv = document.getElementById("mychartcanv");
    var daterange = document.getElementById("daterange");

    mymap.style.display = "none";
    mychartcanv.style.display = "block";
    daterange.style.display = "block";
}

function MaporChart() {
let mychart = document.getElementById("mychartcanv");
let mymap = document.getElementById("mymap");

    if(mymap.style.display != "none" || mychart.style.display != "block"){
        let select = document.querySelector(".select-dropdown");
        let value = select.options[select.selectedIndex].value;

        map.flyTo([ourData[value - 1].Latitude, ourData[value - 1].Longitude],18);
    }
}

fetch("./data/location-data.json")
.then((response) => response.json())
.then((data) => {
    ourData = data;
    for (let i = 0; i < data.length; i++) {
        let option = document.createElement("option");
        option.value = i + 1;
        option.text = data[i].nome;
        document.querySelector(".select-dropdown").appendChild(option);
    }
})
.catch((error) => alert(error));

