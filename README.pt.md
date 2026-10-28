# VolleyOS Global

[English](README.md) · [Español](README.es.md) · **Português**

[![Version](https://img.shields.io/badge/version-v10.1.0-FF3B5C?style=for-the-badge)](https://github.com/v0idbrn/VoleyOS/releases/latest)
[![Módulos](https://img.shields.io/badge/módulos-61-FF3B5C?style=for-the-badge&color=EAB308)](#enciclopédia-dos-61-módulos)
[![Offline](https://img.shields.io/badge/100%25-offline--primeiro-FF3B5C?style=for-the-badge&color=EAB308)](#por-que-o-volleyos-existe)
[![Android](https://img.shields.io/badge/APK%20Android-voleyos--universal-FF3B5C?style=for-the-badge&color=EAB308)](https://github.com/v0idbrn/VoleyOS/releases/latest/download/voleyos-universal.apk)
[![Licença](https://img.shields.io/badge/licença-AGPL--3.0--ou--posterior-FF3B5C?style=for-the-badge&color=EAB308)](LICENSE)

## 📱 Baixar APK para Android

[![Download APK](https://img.shields.io/badge/APK-voleyos--universal.apk-FF3B5C?style=for-the-badge&logo=android)](https://github.com/v0idbrn/VoleyOS/releases/latest/download/voleyos-universal.apk)

APK universal assinado, construído pelo GitHub Actions a cada tag `v*`. Android 7.0+ (minSdk 24), trilíngue, offline primeiro, sem contas e sem telemetria. Pronto para F-Droid.

## 🆕 Novidades da v10.1.0 — Edição pronta para a quadra

- **⚡ Placar Simples / Pro**: uma chave de nível superior (nos ⚙️ Ajustes ou no próprio placar) deixa só a tela limpa e gigante — presets, box score, rotações e scouting fora — ou devolve todos os painéis. A escolha persiste e todas as abas existem nos dois modos.
- **👥 Só Equipes**: placar apenas com times, escondendo scouting de jogadores, dorsais e box score em um toque.
- **✏️ Correções na quadra**: ajuste um parcial, um tempo ou uma chamada corrigida e renomeie/pinte os times direto no placar — com o desfazer intacto.
- **🔊 Áudio e voz universais**: apito e buzina Fox 40/FIVB em PCM para qualquer aparelho (RIFF WAV + WebAudio, AudioTrack nativo no Android) com locutor de voz em 4 níveis (TTS nativo → voz web parecida → qualquer voz → cadência formante) e teste de áudio em um toque.
- **🔙 Guarda de voltar**: um back acidental do navegador ou do hardware não apaga uma partida em andamento — web e Android rebatem com aviso.
- **📲 Compartilhar + offline afiado**: cartão Web Share nos Ajustes (fallback para a área de transferência), cache do service worker v10.1.0 com o ícone apple, manifesto com os 61 módulos e piso anti-zoom de 16px em telas sensíveis ao toque.
- **Mantém tudo do v10.0.x**: cofre Olympus Titan, micro-scout ao vivo, overlay de TV e o ícone adaptativo obsidiana/carmesí.

## 🆕 Novidades da v10.0.0 — Edição Olympus Titan

- **🛡️ Cofre à prova de falhos e manipulação**: motor IndexedDB de 500 MB acima do teto de 5 MB do WebView, partidas da Minha Temporada encadeadas por Merkle, exportações `.vos` com AES-256-GCM e um relógio monotônico que rejeita viagem no tempo de licenças.
- **🥊 Micro-scout ao vivo**: marque cada ponto em um toque (ataque/bloqueio/ace/toque/erro do rival) na ⏱️ Cancha e ganhe um box score R1–R6 estilo DataVolley — K1 de side-out, K2 de break-point, eficiência de ataque, aces/bloqueios — mais um 🧠 alerta de rotação sangrando com a zona a cobrir ou o tempo a pedir.
- **🗺️ Zero digitação dupla**: as coordenadas dos seus remates marcados alimentam sozinhas o Mapa de Calor de Remates, para um relatório completo no fim da partida.
- **📺 Overlay de TV estilo VNL/ESPN** em `/tv`: chips set a set, placar ao vivo da sala/malha e parâmetros para OBS Browser Source `?chroma=1` (verde EBU `#00B140`) e `?clean=1` (sem controles).
- **🔑 Malha de banco com PIN**: o hotspot da quadra sem dados trava `/state` atrás de um PIN de 4 dígitos; os celulares do banco escaneiam um QR para o placar gigante travado em `http://<ip>:8765/?pin=NNNN` — 0 MB de internet.
- **🔫 Radar de bola ao vivo**: arme na soltura, pare no portão e leia km/h com melhor/média e níveis PRO/ÉLITE/CLUBE/BASE em portões de 3 m, 9 m e 18 m.
- **⚡ Teste de tempo de reação**: pad de estímulo à prova de largada errada (atraso 0,8–2,2 s, janela 80–1200 ms) com média/melhor/nota no Treino de Reflexos.
- **⫲ Telestrator dividido 2.0**: carregue os vídeos A e B lado a lado com traços independentes e sincronização em um toque.
- **Mantém tudo do v9.4/v9.5**: o escudo anti-hack, a ergonomia de quadra, o kit Athlete's Edge, ⭐ Meus Fixados e o cofre `.vos` assinado.

## ❤️ Apoie o VolleyOS

Grátis, 100% offline, sem contas, sem telemetria e sem anúncios — bancado pela comunidade.

- ☕ Ko-fi: https://ko-fi.com/unfrgvnn
- 💵 Alias Mercado Pago: `unfrgvnn.dead`
- 👑 Troque um código `VOS-CHIP` pelo selo dourado de patrocinador; os apoiadores aparecem nestes READMEs a cada release.

## Por que o VolleyOS existe

O vôlei é anotado, treinado e organizado nas **piores superfícies para tecnologia**: silêncio de ginásio, sol de praia, mesas de torneio com celulares morrendo. As ferramentas que o esporte adotou são planilhas de papel, apps de nuvem que caem no minuto zero ou assinaturas atrás de uma conta que ninguém do ginásio tem. O VolleyOS ataca de frente essas dores:

- **Anotadores** não podem digitar de luva num ginásio barulhento: o VolleyOS anota com os **botões físicos de volume**, mostra uma **tela gigante legível a 30 metros** e nunca pede internet.
- **Técnicos** não têm tempo para quatro toques por dado: scouting, tempos, validação de rodízio e monitor de carga rodam em um toque, com resultados legíveis no meio do set.
- **Árbitros** precisam manter a súmula oficial offline: o VolleyOS produz uma súmula A4 FIVB imprimível com sets, substituições, punições e selo SHA-256, mais um clone QR do placar ao vivo para a mesa, sem conexão.
- **Organizadores** desenham chaves em guardanapo: o VolleyOS semeia chaves eliminatórias, equilibra rachas, racha custos de quadra no centavo exato e valor decks de patrocinadores.
- **Torcidas** querem contexto sem conta: trivia de arquibancada, gírias mundiais de quadra e pôsteres rodam localmente.

Tudo roda dentro do navegador ou WebView com **zero chamadas de rede**, trilíngue (**ES / EN / PT**) com vocabulário de quadra autêntico — *armador, defesa K1, costura, pipe, rodízio* — nunca traduções literais robotizadas.

## Como o VolleyOS é usado: a aba nativa de 5 seções

O app é um casco fixo `100dvh` com cara de Android. Na primeira abertura, um **onboarding de 3 toques** (idioma → papel → quatro favoritas) abre a aba que você mais vai usar e fixa os quatro módulos que importam no seu papel.

### 🏠 Início

- Filtre os 61 módulos pelo seu papel na quadra (6 perfis, 10 ou 11 módulos cada) ou busque pelo nome.
- Marque com estrela para fixar no topo: sua estação diária fica a um toque.
- Cada card carrega número, ícone e tagline para achar "o do rodízio" sem saber slugs.
- Abra a suíte 🍻 Picadito & Amigos pela barra superior: as 8 ferramentas casuais para o vôlei de todo dia, também destacada no modo 🌱 Novato.

### ⏱️ Quadra

1. **Crie seus times uma vez:** nome, código de 3 letras e cor de camisa ficam no `localStorage`. Dentro de cada time você gerencia até **20 jogadores** — 6 titulares (zonas I–VI), reservas no banco, até 2 líberos — com número, nome, posição (`S / OH / MB / OPP / L`) e distintivo de capitão. Cole a lista de uma vez: `10 Juan S, 7 Pedro OH, 12 Lucas MB`.
2. **Escolha o formato:** **Melhor de 3** (sets 1–2 a 25, decisivo a 15) ou **Melhor de 5** (sets 1–4 a 25, decisivo a 15), com **duplo de 2 oficial** ou **ponto de ouro**.
3. **Anotar sem olhar o celular:** `Vol+` soma pro local, `Vol-` pra visita, toque longo desfaz o último ponto — você não desbloqueia nada no meio do rali.
4. **O motor fecha o set por você:** em 24-24 o alvo se estende (26-24, 27-25…), os banners **SET POINT** / **MATCH POINT** aparecem sozinhos, o set é arquivado em 25-x / 26-24, e um set decisivo ativa o tie-break a 15 com o aviso de **troca de lado no ponto 8**.
5. **Desfazer entre sets:** apertou `+1` em 24-20 por engano? `⏪ Desfazer` reabre o set em 24-20 com o contador de sets intacto.
6. Abrir a **Tela Gigante de Ginásio** (botão `TV`): um quadro em tela cheia que a plateia lê da arquibancada.

### 📋 Lousa

- Valide formações **5-1 / 6-2 / 4-2** e faltas de rodízio FIVB contra o rodízio que está rodando.
- Anime uma sequência saque→transição→ataque em **3 fases** sobre a quadra SVG com seu time ativo.
- Toque a origem do ataque, toque o destino, marque o resultado (`#` ataque, `!` em jogo, `=` bloqueado) e monte o **mapa de calor** das 9 zonas.
- Use a calculadora de sombra de bloqueio para cobrir com duplo bloqueio e o lab de block-out para decidir mão abaixo ou cepilhar o bloqueio.

### ⚡ Lab & IA

- Carregue um vídeo da galeria no **telestrator quadro a quadro** (`-1` / `+1` a 30/60/120 fps, câmera lenta 0.1x–1x).
- Marque **decolagem** e **aterrissagem** e leia a altura do salto vertical no ato pelo tempo de voo (`h = ⅛ · g · t²`), exata ao centímetro a 60 fps.
- Desenhe vetores de ataque e ângulos articulares sobre o vídeo e exporte o frame anotado com selo `VOS-SEAL`.
- Rode o lab de biomecânica de 5 fotogramas, o treinador de tempos e o radar de habilidades de 6 eixos.

### ⚙️ Ajustes, cofre e sincronia QR

- Exporte livros **OpenXML `.xlsx`** reais e súmulas A4 imprimíveis no Modo Avião — sem app de planilha, sem servidor, sem conta.
- Clone um placar ao vivo para outro celular via **QR multiframe** (tokens assinados HMAC) com os dois aparelhos offline.
- Guarde relatórios no **cofre efêmero** e destrua com um toque (delete real, sem lixeira).
- Copiar/colar nativo funciona em toda entrada de texto — cole uma lista ou uma chave sem brigar.

### 🍻 Picadito & Amigos

Oito ferramentas para o jogador do dia a dia, a um toque da barra do Início e destacadas no modo 🌱 Novato; o placar também traz o rodízio com banco e o limite de saques.

| Ferramenta | O que faz |
| --- | --- |
| 📋 Montador de Lista do WhatsApp | Cole a lista do grupo, defina o limite, promova a fila quando alguém cai fora e copie a lista atualizada ou o cartaz "falta 1". |
| 🪇 Rodízio com Banco (7-10) | Gira as 6 zonas a cada saída de bola e entra o próximo do banco na posição I ou VI, com tabela de rodízios justa. |
| 🎯 Limite de Saques Recreativo | Off / 3 / 5 saques seguidos no placar da rachinha, com aviso amigável quando um sacador segura o jogo. |
| ⚖️ O Juiz da Rachinha | Resolve as 5 clássicas (pé na linha, mão dura, dedo, dois toques e rede) pelo observável acordado e a regra em 3 idiomas. |
| 📣 Tradutor de Sinais e Gritos | Busca de gritos de quadra ES/EN/PT sem depender de acento, com o contexto de uso. |
| 🔥 Aquecimento Express (4 min) | Cronômetro de 4 fases: mobilidade, ativação, rebote e golpes, pronto em quatro minutos. |
| 💰 A Vaquinha 2.0 Compensada | Fecha as taxas contra créditos de equipamento em centavos inteiros e avisa se falta grana no caixa. |
| 🏆 Prêmios da Rachinha | Cartaz SVG compartilhável em um toque: campeão, prêmio, vice e MVP. |

## Enciclopédia dos 61 módulos

Seis perfis, dez ou onze módulos cada. Cada entrada: para **que** serve e **como** se usa.

### Jogador

| # | Módulo | Para que serve | Como usar |
|---|--------|----------------|-----------|
| 1 | Laboratório 5 Fotogramas (`biomechanics`) | Converte um ataque ruim em diagnóstico mecânico, não em opinião. | Entre os 5 checkpoints (joelho, braço, impacto, janela, simetria); saia com nota e correção prioritária. |
| 2 | Racha Equilibrada (`pickup`) | Ninguém arma times alinhando amigos na sorte. | Cole nomes com nota; saem dois times equilibrados e a sentença do Rei da Quadra. |
| 3 | VolleyCard e Radar (`volleycard`) | Mostra ao jogador como um scout o lê. | Note salto / ataque / saque / recepção / defesa / leitura 1–99; exporte o card. |
| 4 | Tempos de Ataque (`tempo`) | Ensina tempo 1/2 e a janela do pipe em milissegundos reais. | Registre cada salto do levantador; o sistema marca cedo/perfeito/tarde com tolerância. |
| 5 | Sinais do Levantador (`setter-signals`) | Troca o código de dedos por chamadas auditáveis sem colisão. | Escolha seu sistema; a folha prova que nenhum sinal colide com outro. |
| 6 | Radar de Velocidade de Saque (`serve-radar`) | Converte km/h crus em plano de aces. | Entre velocidade e zona da recepção; saia com plano de saque e leitura de reação. |
| 7 | Lab de Aerodinâmica Magnus (`ball-aerodynamics`) | Explica com números um flutuado que morre no meio do voo. | Entre velocidade, rotação e ângulo de lançamento; confira previsão de queda e crise de flutuação. |
| 8 | Cortador de Hightlights (`rally-clipper`) | Monta um reel sem editor de vídeo. | Registre início/fim em segundos e habilidade por rali; saia com plano ffmpeg e EDL. |
| 9 | Telestrator de Vídeo (`video-telestrator`) | Converte vídeo da galeria em dados de biomecânica. | Carregue o vídeo, ande quadros, marque decolagem e aterrissagem; exporte a telestração selada. |
| 10 | Animador de Jogadas (`playbook-animator`) | Troca as giz por uma jogada animada em 3 fases. | Escolha fases (saque, transição, ataque), jogadores e zona alvo; reproduza e exporte o SVG. |

### Técnico e Tática

| # | Módulo | Para que serve | Como usar |
|---|--------|----------------|-----------|
| 2 | Quadro 5-1 e Rodízio (`rotation`) | Mata derrotas por rodízio antes do apito. | Monte as formações R1–R6; o validador marca rodízios indevidos e corrige o quadro. |
| 3 | Scout em 3 Toques (`scouting`) | Produz um mapa real do rival no meio do jogo. | Toque posição, zona e resultado por bola; o relatório ranqueia ameaças e zonas. |
| 12 | Monitor ACWR (`acwr`) | Detecta o pico de carga antes de os joelhos pagarem. | Registre saltos diários; leia a razão agudo/crônico e os limites semanais seguros. |
| 13 | Sombra de Bloqueio e Cobertura (`block-shadow`) | Quantifica quem fica destapado com seu duplo bloqueio. | Escolha bloqueadores e esquema; leia o % da quadra coberta e as costuras livres. |
| 15 | Auditor de Imprevisibilidade do Levantador (`setter-iq`) | Encontra quais bolas ganham e quais se entregam. | Entre cada distribuição; leia imprevisibilidade e eficiência por set. |
| 32 | Matriz 6x6 de Cruzamentos (`matchup-matrix`) | Ponha seus melhores bloqueadores sobre a canhoneira rival. | Note a matriz 6x6 atacante/bloqueador; saia com melhor rodízio e ordem de saque. |
| 40 | Simulador 4-2 / 6-2 / 5-1 (`system-transition`) | Confirma qual sistema funciona com seu elenco. | Note levantadores, consistência de recepção e penetração; leia a recomendação. |
| 41 | Leitor de Enganos (`deception-reader`) | Mede quão legíveis são seus atacantes. | Entre velocidade de corrida, altura de cotovelo e linha de bola; leia o compromisso provável da defesa. |
| 54 | Nutrição de Torneio (`tournament-nutrition`) | Mantém uma sequência de dois jogos viva até o quinto set. | Entre peso, jogos, minutos, temperatura e taxa de suor; leia carboidratos, líquido e sódio. |
| 55 | Prehab de Lesões (`injury-prehab`) | Marca o risco de joelho e ombro antes do volume lesionar. | Entre volume de saltos, ataques, sono e dor; saia com nota de risco, teto de saltos e exercícios. |

### Quadra

| # | Módulo | Para que serve | Como usar |
|---|--------|----------------|-----------|
| 4 | Placar Indoor 6x6 (`scoreboard`) | Substitui o fliper de papelão e a súmula de papel. | Anote com os botões de volume; duplo, fechamento de set e histórico automáticos. |
| 8 | VAR de Bolso (`var`) | Resolve disputas de toque na quadra de rua. | Registre a jogada; saia com a decisão, a moeda e o contador de desafios. |
| 9 | Beach 2x2 (`beach`) | Anota regras de areia, trocas e formato Newcom. | Escolha 2x2; trocas e alvos de set ficam resolvidos. |
| 14 | Radar de Costuras do Passe (`seam-radar`) | Vê a costura da recepção antes do saque. | Escolha tipo de saque e posições receptores; leia a fresta em cm e quem cobre. |
| 20 | Controle de Substituições e Retornos (`substitution-tracker`) | Mantém a mesa honesta com o limite de 12 substituições. | Logue trocas e retornos; cheque a contagem viva e o limite. |
| 33 | Lab de Block-Out (`blockout-lab`) | Põe preço esperado em mão abaixo vs cepilhar o bloqueio. | Escolha o esquema de bloqueio; saia com a decisão e a explicação. |
| 42 | Mini e Vôlei Sentado (`inclusive-adaptive`) | Adapta qualquer jogo para sentado, mini ou misto. | Escolha modo, categoria e número de jogadores; leia o regulamento adaptado. |
| 45 | Regras da Casa e Relojito (`house-rules`) | Roda um jogo noturno com regras de rua sem caos. | Escolha formato, ordem de banco e placar; saia com a lista branca pra começar, ou a falta. |
| 49 | Tela Gigante de Ginásio (`gym-screen`) | Transmite o placar mesmo pra arquibancada. | Toque `TV` ou chame a bridge; um quadro em tela cheia a 30 metros toma a tela. |
| 60 | Reflexo Periférico (`peripheral-reflex`) | Treina o olho que ganha defesas duras e bloqueios de rebote em sets fechados. | Registre tempos de reação em ms; leia média, dispersão, consistência e nota. |

### Torneio e Racha

| # | Módulo | Para que serve | Como usar |
|---|--------|----------------|-----------|
| 5 | Torneios Relâmpago (`tournament`) | Arma a copa e publica a tabela sem Excel. | Escolha times e formato; saia com calendário, classificação e movimentos de ranking. |
| 21 | Racha da Quadra - Vaquinha (`court-split`) | Termina a briga de "quem paga o que" em três segundos. | Entre horas de quadra e tarifas locais por hora; saia com a racha por jogador no centavo. |
| 25 | Lousa de Tempo Técnico (`timeout-chalkboard`) | Converte os 30 segundos de reunião em tática escrita. | Escolha o bloco tático com o timer FIVB rodando; exporte a lousa. |
| 26 | Coach de Momentum (`momentum-coach`) | Lê o momento e indica apertar o saque ou pedir tempo. | Logue os últimos ralis da janela de 6; saia com a decisão e os motivos. |
| 27 | Draft Serpente (`captain-draft`) | Roda um picking em cobra que renderiza dois times justos. | Cole a lista de jogadores; saia com a ordem cobra e a auditoria prontas. |
| 34 | Planejador de Treino (`practice-planner`) | Monta um treino de 60/90/120 minutos em blocos. | Escolha foco e duração; leia blocos com objetivos, exercícios e metas de pontos. |
| 39 | Dossiê de Recrutamento (`recruiting-dossier`) | Candidata um recruta universitário sem scanner. | Entre objetivos, ano de formatura e mensurações; saia com um dossiê selado pronto pra enviar. |
| 44 | Tesouraria do Time (`team-treasury`) | Termina o quem-pagou-a-camisa. | Entre mensalidades, bolo de bolas e pagamentos; leia saldos por jogador e exportações. |
| 53 | Mapa de Calor de Ataques (`shot-heatmap`) | Lê tendências de ataque do rival por zona. | Toque origem e destino; leia zonas quentes, eficiência e repartição por zona. |
| 57 | Arquiteto de Chaves (`bracket-architect`) | Semeia chaves sem cruces repetidos antes da final. | Cole a lista de times; saia com a rodada semeada, os byes e todas as rodadas. |

| 61 | Estúdio de Marca do Clube (`club-white-label`) | Seu clube deixa de parecer genérico dentro do app. | Informe nome e três cores; confira o contraste legível e copie as variáveis CSS. |

### Árbitro e Mesa

| # | Módulo | Para que serve | Como usar |
|---|--------|----------------|-----------|
| 16 | Boleta FIVB I-VI (`lineup-slip`) | Previne erros de boleta e janelas de líbero tortas. | Entre os 6 titulares I–VI; a boleta valida e imprime com a janela do líbero. |
| 17 | Selo Criptográfico Antifraude (`integrity-seal`) | Prova que uma súmula não foi tocada após assinada. | Assine JSON canônico com HMAC-SHA256; verifique depois em uma chamada. |
| 19 | Console de Árbitro e Apito (`referee-console`) | Fala os 21 cartões FIVB do bolso. | Escolha o evento; leia cartão, gesto e redação formal. |
| 28 | Passe de Elenco (`roster-pass`) | Audita um elenco contra as regras de 12 jogadores. | Cole o elenco; saia com checagens de capitão/líbero e o passe. |
| 29 | Inspetor de Rede e Bola (`equipment-inspector`) | Certifica altura de rede e pressão de bola dentro de tolerância. | Entre os valores medidos; saia com passa/falha contra as tolerâncias oficiais. |
| 36 | Passaporte de Carreira (`player-career`) | Entrega um dossiê de progressão pronto pro clube. | Note os 5 eixos contra referências; saia com índice 0-100 e a próxima melhoria. |
| 43 | Ranking ELO / FIVB (`elo-ranking`) | Ranqueia times ponderando margem, não só vitória. | Entre ratings e resultado; leia os ratings novos passo a passo. |
| 48 | Sincronia QR Sem Conexão (`qr-sync`) | Clona estado entre celulares sem rede alguma. | Escolha payload e tamanho de matriz; escaneie a matriz SVG assinada com os dois aparelhos offline. |
| 50 | Súmula FIVB (`fivb-escoresheet`) | Produz a súmula A4 oficial com punições incluídas. | Entre sets (Bo3/Bo5), trocas, punições e assinaturas; imprima a súmula. |
| 56 | Comandante de Tie-Break (`tiebreak-commander`) | Arbitra o set decisivo com calma em 14-14. | Entre placar e sacador; leia fase, aviso de troca de lado e a recomendação. |

### Torcida e Redes

| # | Módulo | Para que serve | Como usar |
|---|--------|----------------|-----------|
| 7 | Overlay TV para OBS (`overlay`) | Alimenta o overlay do stream sem websockets. | Escolha tema e times; cole o SVG 1920x1080 no OBS. |
| 18 | Cápsula Universal .volleyos (`capsule-io`) | Move uma partida inteira entre aparelhos. | Exporte estado → cápsula → importe no outro aparelho; JSON selado. |
| 22 | Parceiro de Torcida (`fan-companion`) | Trivia e prática de gestos de árbitro na arquibancada. | Logue jogadas; leia a linha de trivia e o gesto que falta aprender. |
| 24 | Prêmios MVP de Quadra (`mvp-awards`) | Entrega prêmios pós-jogo à prova de trapaça. | Note o jogo; saia com artilheiro, melhor bloqueador e melhor defensor com token selado. |
| 30 | Pôster SVG da Partida (`match-poster`) | Publica o jogo da semana em um toque. | Escolha tema, tamanho e texto; exporte um pôster SVG 1080x1920 ou 1080x1080. |
| 35 | Narrador da Partida (`play-by-play`) | Narra o jogo em ES/EN/PT. | Logue eventos; leia a crônica correndo. |
| 46 | Arena DJ de Estádio (`arena-dj`) | Dispara cues de bloqueio / ataque / ace sem internet. | Escolha o evento; o cue WebAudio e o banner pulam no ato. |
| 47 | Gírias Mundiais de Quadra (`court-slang`) | Explica termos AR/ES/MX/BR/US para visitantes. | Entre o termo e a origem; leia significado, uso real e uma frase local. |
| 58 | Deck de Patrocinadores (`sponsor-deck`) | Valora banners e posts em moeda local. | Entre impressões, alcance, CPM e engajamento; leia tier, CPM efetivo e o valor. |
| 59 | Cara a Cara (`head-to-head`) | Soma o histórico de dois times antes do jogo. | Entre placares; leia vitórias, sets, dominante e a sequência vigente. |

## Arquitetura e escudo de segurança

- **Backend:** Python 3.13+ / FastAPI / Pydantic v2, física e dinheiro **só em `Decimal`** (zero floats binários), SQLite (WAL) para salas e jobs.
- **Frontend:** Next.js App Router + TypeScript estrito (zero `: any`), Tailwind, Zod, Vitest; 61 espelhos TS dos 61 motores Python.
- **Android:** Gradle, AGP 8.5.2, JDK 17; WebView endurecida; bridge JS para anotar por volume, navegação voltar e tela de ginásio; `screenOrientation="user"` por todo lado, sempre respeitando o bloqueio de rotação do celular.
- **Segurança:** CSP e cabeçalhos rígidos de privacidade (`no-store`, `nosniff`, `no-referrer`, anti-framing DENY), teto de corpo 256 KiB, 120 req/min/IP, saneamento de XSS e injeção de fórmula, selos de integridade HMAC-SHA256.
- **Build dual:** `NEXT_PUBLIC_BUILD_TARGET=cloud|fdroid` compila o mesmo código pro Cloud Pro comercial e a versão livre F-Droid.
- **Chave Creator:** só o digest SHA-256 viaja na build pública; a chave mestra crua nunca sai de GitHub Secrets nem da sua máquina.

### Builds duais de APK

| Build | Sinalizadores | Desbloqueia | Distribuição |
|-------|---------------|-------------|--------------|
| `voleyos-universal.apk` | target cloud, dev unlock off | Catálogo padrão + paywall Cloud Pro | GitHub Release pública |
| `voleyos-creator-unlocked.apk` | target cloud, dev unlock on | 100% dos módulos + White-Label, zero paywalls | Só do dono (artefato, apagado após baixar) |

## Guia de auto-alojamento

```bash
# Windows
run_local.bat

# Linux / macOS
./run_local.sh
```

Backend em `http://localhost:8000` (docs da API em `/docs`), app em `http://localhost:3000`. Com Docker:

```bash
docker compose up --build
```

Para servir o app sem backend algum:

```bash
cd frontend && VOLEYOS_STATIC_EXPORT=true npm run build
# sirva ./out com qualquer servidor de arquivos; tudo funciona offline.
```

APK Android local:

```bash
build_apk.sh        # ou build_apk.bat no Windows
```

## Superfície da API

- `GET /api/v1/health/deep` - saúde e versão dos 61 motores.
- `GET /api/v1/catalog/modules` - módulos, amostras, perfis e preços.
- `POST /api/v1/modules/{slug}/run` e `/demo` - rodar um motor.
- `POST /api/v1/security/verify-seal` - verificar uma súmula assinada.
- `POST /api/v1/live` -> `GET /api/v1/live/{room_id}` - criar e ler uma sala ao vivo respaldada em SQLite; PATCH e DELETE pedem X-Admin-Token.
- `POST /api/v1/jobs` -> `GET /jobs/{id}/preview` -> webhook de pagamento assinado -> `GET /jobs/{id}/download?format=xlsx|csv` (402 até pagar).
- `DELETE /api/v1/jobs/{id}` - destruir dados e devolver um recibo UTC assinado.

Toda resposta da API carrega `no-store`, `nosniff`, `SAMEORIGIN`, `no-referrer` e um Permissions-Policy rígido. Pedidos mutantes são limitados a 256 KiB e 120 por minuto por IP.

## Compuertas de desenvolvimento

```bash
cd backend && .venv/Scripts/python -m pytest -q       # Windows
cd backend && .venv/bin/python -m pytest -q            # Linux/macOS
cd backend && .venv/Scripts/python -m ruff check app tests
cd backend && .venv/Scripts/python -m mypy --strict app
cd frontend && npm run typecheck && npm run test && npm run build
```

## Documentação

- `docs/HANDOFF.md` - diário de sprints e estado.
- `docs/QA_REPORT.md` - compuertas, evidência E2E e limites conhecidos.
- `docs/LAUNCH_PLAYBOOK.md` - deploy, domínio, pagamentos, rollback.
- `docs/FDROID_SUBMISSION_GUIDE.md` - distribuição Android offline.
- `docs/openapi.json` - contrato de API gerado.
- `SECURITY.md` - divulgação de vulnerabilidades e modelo de ameaça.
- `CONTRIBUTING.md` - instalação local, estilo e compuertas de PR.

## Licença

AGPL-3.0-or-later (ver `LICENSE`). Amigável ao F-Droid: sem rastreamento, sem SDKs proprietários, sem telemetria. O White-Label comercial roda sob contrato apartado - o core aberto continua aberto.
