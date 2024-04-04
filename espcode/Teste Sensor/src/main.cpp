#include <Arduino.h>

int sensorPin = D5;
volatile long pulso = 0;
int litros = 0;
void incrementa();

void setup() {

  pinMode(sensorPin, INPUT);
  Serial.begin(115200);
  attachInterrupt(digitalPinToInterrupt(sensorPin), incrementa, RISING);

}

void loop() {

  litros = pulso/500;
  Serial.println(litros);
  delay(500);

}

ICACHE_RAM_ATTR void incrementa() {

  pulso++;

}