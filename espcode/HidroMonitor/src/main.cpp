/*#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include <NTPClient.h>

#include <WiFiUdp.h>

FirebaseAuth auth;
FirebaseConfig config;
String uid;
String estadoPath;
FirebaseData fbdo;

void initWiFi() {
  WiFi.begin("HUAWEI-2.4G-z33M", "96191048");
  Serial.print("Connecting to WiFi ..");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print('.');
    delay(1000);
  }
  Serial.println(WiFi.localIP());
  Serial.println();
}

void setup() {

  Serial.begin(115200);
  initWiFi();
  //Inicialização da conexão com o Firebase
  config.api_key = "AIzaSyDjtOrCWUlUJqj9mSmmrgCBOCqpY8T4uGk";
  auth.user.email = "joao.victor.cruz@uel.br";
  auth.user.password = "hidro1234";
  config.database_url = "https://hidramonitor-default-rtdb.firebaseio.com/";

  //Configuração do WiFi
  Firebase.reconnectWiFi(true);

  //Configuração do token
  config.token_status_callback = tokenStatusCallback;
  config.max_token_generation_retry = 5;
  Firebase.begin(&config, &auth);

  //Verificação da conexão com o Firebase
  while ((auth.token.uid) == "") {
    delay(1000);
  }

  //Retorno do UID do usuário
  uid = auth.token.uid.c_str();
  Serial.println(uid);
  
  estadoPath = "/dados/" + uid + "/teste";
  Serial.printf("envia Fluxo... %s\n", Firebase.RTDB.setInt(&fbdo, estadoPath.c_str(), 123) ? "ok" : fbdo.errorReason().c_str());
}

void loop() {
  // put your main code here, to run repeatedly:
}*/

#include <ESP8266WiFi.h>
#include <ESPAsyncTCP.h>
#include <ESPAsyncWebServer.h>

const char *apSSID = "ConfiguraESP"; // SSID temporário para o ponto de acesso
const char *apPassword = "senha123";   // Senha do ponto de acesso temporário
String wifiSSID = "";                  // SSID da rede WiFi
String wifiPassword = "";              // Senha da rede WiFi
float latitude = 0.0;                  // Latitude inicial
float longitude = 0.0;                 // Longitude inicial

AsyncWebServer server(80);

bool wifiConnected = false; // Variável de controle para verificar se a conexão Wi-Fi já foi estabelecida

void setupAP() {
  // Configurar o ponto de acesso
  WiFi.mode(WIFI_AP);
  WiFi.softAP(apSSID, apPassword);

  // Configurar rotas para a página de configuração
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    String html = "<html><body>";
    html += "<h1>Configurar Dispositivo</h1>";
    html += "<form action='/save' method='post'>";
    html += "SSID: <input type='text' name='ssid'><br>";
    html += "Senha: <input type='password' name='password'><br>";
    html += "Latitude: <input type='text' name='latitude'><br>";
    html += "Longitude: <input type='text' name='longitude'><br>";
    html += "<input type='submit' value='Salvar'>";
    html += "</form></body></html>";
    request->send(200, "text/html", html);
  });

  // Configurar rota para salvar as informações
  server.on("/save", HTTP_POST, [](AsyncWebServerRequest *request) {
    wifiSSID = request->arg("ssid");
    wifiPassword = request->arg("password");
    latitude = request->arg("latitude").toFloat();
    longitude = request->arg("longitude").toFloat();
    request->send(200, "text/plain", "Configuração Salva.");
    wifiConnected = true; // Definir a variável de controle como verdadeira
  });

  server.begin();
}

void connectWiFi() {
  // Conectar-se à rede Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());
  int timeout = 10; // Tempo de espera em segundos
  while (WiFi.status() != WL_CONNECTED && timeout > 0) {
    delay(1000);
    timeout--;
    Serial.println("Conectando à rede Wi-Fi...");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Conectado à rede Wi-Fi.");
  } else {
    Serial.println("Falha na conexão à rede Wi-Fi.");
  }
}


void setup() {
  Serial.begin(115200);
  setupAP(); // Configurar o ponto de acesso temporário
}

void loop() {
  if (!wifiConnected) {
    connectWiFi(); // Conectar-se à rede Wi-Fi apenas se ainda não estiver conectado
  }

  // Resto do seu código aqui
}



