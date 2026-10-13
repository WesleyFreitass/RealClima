# 🌦️ RealClima (Multi-Model Weather Ensemble & Living Sky)

Aplicativo moderno de alta precisão para previsão meteorológica e radar em tempo real, agregando dados de múltiplos supercomputadores globais, calculando o **consenso numérico ponderado**, com interface viva (*Living Sky*) e widget nativo para Android.

---

## 🚀 Modelos Meteorológicos Integrados

| Provedor / Modelo | Origem | Descrição |
| :--- | :--- | :--- |
| **ECMWF IFS** | 🇪🇺 Europa (Reino Unido / UE) | Centro Europeu de Médio Prazo. Padrão ouro em acurácia global. |
| **NOAA GFS** | 🇺🇸 Estados Unidos | Global Forecast System da agência governamental americana. |
| **DWD ICON** | 🇩🇪 Alemanha | Modelo de grade icosaédrica de alta resolução orográfica. |
| **CMC GEM** | 🇨🇦 Canadá | Centro Meteorológico Canadense (especialista em dinâmicas polares). |
| **wttr.in / WWO** | 🌐 Internacional | Agregação de observações diretas de estações de superfície. |
| **OpenWeatherMap** | 🔑 Opcional | Suporte a chave de API própria nas configurações do app. |

---

## ⚡ Funcionalidades Principais

* **Algoritmo de Consenso Ponderado:** Média e mediana matemática entre modelos para anular leituras discrepantes (*outliers*).
* **Living Sky Interface:** Atmosfera viva com nuvens volumétricas, chuva, raios e gradientes celestes dinâmicos que se adaptam à hora e condição climática.
* **Widget Nativo Android (Hora a Hora):** Widget moderno na tela inicial do celular com temperatura atual, condição visual e previsão das próximas horas.
* **Radar de Chuva ao Vivo (RainViewer):** Mapa interativo com imagens de satélite e radar de precipitação, animação temporal e controle de camadas.
* **Índice de Confiabilidade & Dispersão ($\sigma$):** Mede o desvio padrão entre os modelos e atribui selo de confiança (Alta, Moderada ou Incerteza).
* **Curvas de Divergência (24 Horas):** Gráfico interativo comparando as projeções térmicas de cada supercomputador para o mesmo local.
* **Métricas Atmosféricas Detalhadas:** Umidade com avaliação de conforto, vento com bússola direcional, sensação térmica, índice UV e pressão barométrica.
* **Previsão Estendida de 7 Dias:** Mínimas e máximas agregadas com barras de gradiente e chances de chuva.
* **Busca Global & GPS:** Autocomplete com geocodificação em português para qualquer cidade do planeta.

---

## 🛠️ Tecnologias Utilizadas

* **React 19** + **TypeScript**
* **Vite** (Build ultra-rápido)
* **Tailwind CSS v4** (Estilo Dark Glassmorphism)
* **Capacitor & Android Studio** (Empacotamento Android e Widgets Nativos)
* **Leaflet** (Mapas vetoriais e radar de satélite)
* **Lucide React** (Ícones meteorológicos modernos)
* **APIs:** Open-Meteo Multi-Model Ensemble & RainViewer Radar

---

## 💻 Como Rodar Localmente

1. Clone o repositório:
```bash
git clone https://github.com/WesleyFreitass/RealClima.git
cd RealClima
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev -- --host
```

4. Acesse no navegador ou no dispositivo conectado à mesma rede Wi-Fi:
```
http://localhost:5173/
```
