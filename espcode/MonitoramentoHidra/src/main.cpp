#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <time.h>


FirebaseAuth auth;
FirebaseConfig config;
String uid;
String estadoPath;
FirebaseData fbdo;
FirebaseJson json;
FirebaseJson jsonSetup;


String nome = "CTU";
int Taxa = 2; //dados enviados para o database por minuto
float Fluxo = 0;
int resetTime = millis();
int sensorPin = D5;
volatile long pulso = 0;
int ultimoPulso = 0;
int tempoPreSleep = 2; //Se não ouver nenhuma atividade dentro de 2 minutos o ESP entra em sleep mode
void incrementa();
int lastTime = 0;

WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP);

unsigned long regTime() {
    time_t now;
  struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) {
   return 0;
    }
  time(&now);
  return now;
}

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

void sleep(){
    Serial.println("Entrando em modo light sleep...");
    wifi_station_disconnect();
    wifi_set_opmode_current(NULL_MODE);
    wifi_fpm_set_sleep_type(LIGHT_SLEEP_T); // set sleep type, the above posters wifi_set_sleep_type() didnt seem to work for me although it did let me compile and upload with no errors 
    wifi_fpm_open(); // Enables force sleep
    gpio_pin_wakeup_enable(sensorPin, GPIO_PIN_INTR_LOLEVEL); // GPIO_ID_PIN(2) corresponds to GPIO2 on ESP8266-01 , GPIO_PIN_INTR_LOLEVEL for a logic low, can also do other interrupts, see gpio.h above
    delay(1000);
    wifi_fpm_do_sleep(0xFFFFFFF); // Sleep for longest possible time
}

void setup() {

  pinMode(sensorPin, INPUT_PULLUP);

  Serial.begin(115200);
  attachInterrupt(digitalPinToInterrupt(sensorPin), incrementa, RISING);

  //gpio_init(); // Initilise GPIO pins
  initWiFi();
  
  //timer
  const char* ntpServer = "pool.ntp.org";
  configTime(0, 0, ntpServer);

  // Inicialização da conexão com o Firebase
  config.api_key = "AIzaSyDjtOrCWUlUJqj9mSmmrgCBOCqpY8T4uGk";
  auth.user.email = "joao.victor.cruz@uel.br";
  auth.user.password = "hidro1234";
  config.database_url = "https://hidramonitor-default-rtdb.firebaseio.com/";

  // Configuração do WiFi
  Firebase.reconnectWiFi(true);

  // Configuração do token
  config.token_status_callback = tokenStatusCallback;
  config.max_token_generation_retry = 5;
  Firebase.begin(&config, &auth);

  // Verificação da conexão com o Firebase
  while ((auth.token.uid) == "") {
    delay(1000);
  }

  // Retorno do UID do usuário
  uid = auth.token.uid.c_str();
  Serial.println(uid);

  
  estadoPath = "/" + uid + "/" + nome + "/" + nome + "/Taxa";
  Serial.printf("envia Taxa... %s\n", Firebase.RTDB.setInt(&fbdo, estadoPath.c_str(), Taxa) ? "ok" : fbdo.errorReason().c_str());
  
  estadoPath = "/" + uid + "/" + nome + "/" + nome + "/nome";
  Serial.printf("envia nome... %s\n", Firebase.RTDB.setString(&fbdo, estadoPath.c_str(), nome) ? "ok" : fbdo.errorReason().c_str());
  
  // Inicializa o cliente NTP
  timeClient.begin();
}

void loop() {

  if (WiFi.status() != WL_CONNECTED || (auth.token.uid) == "" || (lastTime - resetTime) >= 1800000) {
    Serial.printf("Reconectando...");
    delay(500);
    ESP.restart();
  }

  // Atualiza o cliente NTP para obter a hora atual
  timeClient.update();

    int atual = millis();
  
    if(atual - lastTime >= (60000/Taxa)) {

    unsigned long timeStamp = regTime();

    Fluxo = pulso * 0.002 * Taxa;
    
    // Obtém a data e hora atual
    String Horario = timeClient.getFormattedTime();
    
    // Envia dados para Firebase
    if (Fluxo != 0) {
    String caminho = "/" + uid + "/" + nome + "/" + nome + "/Dados/" + String(timeStamp);
    json.set("/Fluxo", Fluxo);
    json.set("/Tempo", timeStamp);
    Serial.printf("envia Json... %s\n", Firebase.RTDB.setJSON(&fbdo, caminho.c_str(), &json) ? "ok" : fbdo.errorReason().c_str());
    }

    if (pulso == 0) {
      ultimoPulso++;
    } else {
      ultimoPulso = 0;
    }

    pulso = 0;
    lastTime = millis();

    }

    if (ultimoPulso >= tempoPreSleep * Taxa) {
    Serial.println(ultimoPulso);
    ultimoPulso = 0;
    sleep();
    delay(200);
    }
}

ICACHE_RAM_ATTR void incrementa() {
  pulso++;
}
