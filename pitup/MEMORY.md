# PitUp — mémoire de projet (vidéos et campagnes)

> À lire en premier dans toute nouvelle session : « Lis `pitup/MEMORY.md` et reprends le travail PitUp ».
> Dernière mise à jour : 4 novembre 2026.

## 1. Contexte

- **PitUp** : marketplace de Lubumbashi (RDC). Les clients commandent dans des boutiques partenaires (**+100 boutiques**, chiffre confirmé). PitUp livre. **Paiement à la livraison** uniquement.
- Site = appli : **pi-tup.com** (applis App Store et Google Play).
- Public cible des vidéos produits : **jeunes de 15 à 25 ans**, surtout les filles (« girly ») pour la mode et la beauté.
- Langue : français. Tutoiement dans les pubs.

## 2. Règles validées par le fondateur (à respecter sans exception)

### Contenu
- **Ne jamais inventer** de chiffres, de fonctionnalités ou de noms. Seul chiffre confirmé : « +100 boutiques ».
- **Pas de prix** dans les vidéos, sauf demande explicite. La dernière consigne (fin octobre) est : « Ne mets pas le prix ». Si un prix est demandé, l'afficher en FC et en $ (1 $ = 2 300 FC), sans « au lieu de ». Le prix PitUp est `customer_price` dans l'API, pas `price`.
- **Pas de grandes marques visibles** (Nike, Adidas, Lacoste, LV…). **Exception** pour la catégorie chaussures : marques autorisées, avec les vrais noms des modèles (Stan Smith, Campus, Samba…).
- Articles **seuls, non portés, sans mains**, produit au centre, de qualité.
- **Badges App Store et Google Play à la fin de toutes les vidéos.**
- Pas de compteurs du type « 1/6 ».
- Groupes d'images en nombre impair (1, 3, 5, 7).
- URL « pi-tup.com » épelée lettre par lettre à la voix, en phonétique française : « pé, i, tiret, té, u, pé, point com ». Jamais « P. I. T. U. P. », que la voix lit à l'anglaise.
- Message du service client : « Bonjour Mademoiselle Grâce, c'est le service client PitUp » (sans « Peter »).

### Voix
- **Ne jamais utiliser ElevenLabs.**
- Voix acceptée : **Rémy** (edge-tts `fr-FR-RemyMultilingualNeural`). Script : `tools/tts_edge_words.py`.
- Voix féminine acceptée : **Vivienne** (`fr-FR-VivienneMultilingualNeural`). Elle a été utilisée pour Octobre Rose.
- Voix refusées : **Liam** (accent québécois). Aucune voix gratuite n'a d'accent africain : le mieux serait une vraie voix enregistrée à Lubumbashi.
- Ne pas modifier la voix (pas d'égaliseur ni de compression) : la garder brute.
- **VoxCPM2** (moteur de VoiceStudio, pip `voxcpm`, CPU, environ 30 s par phrase, modèle `openbmb/VoxCPM2`) : crée une voix à partir d'une description, au format `(description)texte`. Script : `tools/vox_design.py`. Essais du 4 novembre (« jeune femme congolaise, douce et dynamique ») : earshot p_real 0,95 et 0,98, transcription exacte. **Le fondateur doit encore les valider.** Il sait aussi **cloner** une voix à partir de 15 à 30 s d'enregistrement : c'est la piste pour une vraie voix de Lubumbashi, avec l'accord écrit de la personne.

### Voix de l'égérie (clonée, 4 novembre)
- L'égérie de PitUp est la sœur du fondateur. Sa voix est clonée avec **VoxCPM2** (`tools/vox_clone_texts.py`), en mode « référence + style ».
- **Référence** : les 21,3 premières secondes de sa vidéo TikTok (micro studio, sans musique), envoyée dans le chat par le fondateur le 4 novembre. **Le fichier audio n'est pas dans le dépôt** (donnée personnelle) : il faut le redemander au fondateur.
- Style qui marche : `(voix douce et posée, chaleureuse, avec le sourire)`.
- **Écrire « Pitt-Eup » ou « Pite-Eupe » à la place de « PitUp »**, sinon elle dit « Pitop ». Lubumbashi est bien prononcé en mode style.
- À éviter : le mode « continuation » (prompt_wav + prompt_text), qui ajoute la fin de sa phrase de référence (« Je te dis… »), et le mode référence seule, qui déforme Lubumbashi.
- Mesures earshot : p_real d'environ 0,93, timbre proche de l'original (brillance 1 900 à 2 300 Hz contre 2 880 Hz).
- Garder l'**accord écrit** de l'égérie pour l'usage de sa voix clonée.
- En attente de validation : v1 (« Pitt-Eup », plus claire) ou v2 (« Pite-Eupe », plus chaude).

### Musique
- Instrumental sous la voix. **Jamais d'amapiano.** Éviter les chansons romantiques (Babydoll, Cheap Cologne, white keys et Has to be you ont été écartées).
- **On peut réutiliser une chanson**, avec un passage différent à chaque fois. L'ancienne règle « une chanson par vidéo » est abandonnée.
- Couper la musique sur les frappes (grille de tempo : `tools/beats_*.py`).
- Bibliothèque d'origine : PitUp-Rise, PitUp-Street, PitUp-Calm, PitUp-Afro (fichiers .wav ou .mp3), Connor Price « I Need Help », Imagine Dragons « Enemy », Kairo Keyz « float 2.0 », Deca OTA « Hallelujah ». Ajouts d'octobre : MARNY « Passer l'hiver », TEZZ (Michael Olise, KANAN, Next Up, SUPRACELL, Coco), OLISE, Kairo Keyz (GANG, WENT UP, Can You Love Me Tonight). **Le fondateur va ajouter de nouvelles musiques** : elles ne sont pas dans le dépôt (droits d'auteur et taille). Il faut les lui redemander.

### Signature sonore
- **Abandonnée (« oublie ça ») le 4 novembre.** Ne pas l'imposer. Le beat synthétique avait été jugé « très IA ». Le piano Salamander (vrais échantillons, CC-BY) passait mieux à l'analyse earshot (p_real 0,94), mais il n'a pas été validé.

## 3. Styles visuels réalisés et retours

| Vidéo | Style | Retour |
|---|---|---|
| Journal (P2), Acheteurs (Pub06), E1 « Comment ça marche » | Papier, journal, Monsieur Peter (bonhomme noir narrateur), voix | Validées après corrections |
| Promo Mini-ventilateurs | Prix FC + $ demandés exceptionnellement | Validée |
| Tendance v2 à v6 | Format « P1 / Ta liste » (graphiste) : produit détouré, grand mot de fond, titres | Validé, puis lassitude (« mêmes articles ») |
| Baskets (catégorie) | P1 avec les noms des modèles | Validée |
| Pour elle | P1 | Refusée : « change la DA, plus de texte, de meilleurs articles » |
| Girly Panorama v1 à v3 | Panoramique sur panneaux pastel, aucun texte, mosaïque, fin PitUp | v3 = la meilleure (catalogue complet, détourage soigné) |
| Storytelling « Grâce » v5 | Dessin, téléphone réaliste avec l'UI PitUp, horloge qui défile, voix Rémy | Corrections faites (horloge, prononciation de l'URL) |
| Octobre Rose v2 | Charte rose, voix Vivienne | Livrée |
| Gourdes style Sony puis 3D, Sacs 3D (Higgsfield) | Pub « Prism » de Sony, Three.js | **Concept rejeté** : « pas fluide, ça s'entre dedans, pas beau » |

À retenir : le fondateur veut des articles **attirants pour les 15-25 ans, variés, jamais déjà vus**, bien détourés, au centre, sans mains ni « autres histoires ».

## 4. Prochaines tâches (au 4 novembre)

1. **Vidéos de présentation d'articles AVEC VOIX.** Ça fait longtemps qu'il n'y a pas eu de publication. Il en faut plusieurs.
2. **Nouvelles vidéos de storytelling** (plusieurs).
3. Attendre les nouvelles musiques du fondateur et les ajouter à la bibliothèque.
4. **Campagne cadeaux de Noël et des fêtes**, à lancer vers mi-novembre (à discuter).
5. Idées de pub retenues, inspirées des grandes marques (voir § 6).

## 5. Méthode technique (recettes testées)

### Catalogue PitUp (API publique, sans connexion)
- `GET https://pi-tup.com/api/v1/marketplace/products/?limit=100&offset=N` : 626 produits, champ `images[]` avec toutes les photos (500 px max), `customer_price` (prix PitUp), `store.store_name`, `category`, `stock_quantity`, `is_in_stock`.
- `GET https://pi-tup.com/api/v1/marketplace/categories/`
- Toujours prendre **la meilleure photo** de chaque produit (souvent pas la principale). Vérifier le stock.

### Images
- **Upscale ×4** : `tools/upscale.py` (Real-ESRGAN en ONNX, modèle `imgdesignart/realesrgan-x4-onnx` sur Hugging Face, à télécharger dans `/root/.cache/esrgan/model.onnx`). Environ 1 min par photo sur CPU.
- **Détourage** : `tools/cut_v6.py` (rembg `isnet-general-use`, agrandissement ×2, nettoyage identique pour tous les objets, en gardant tous les objets d'au moins 12 % de la taille du plus grand). Toujours vérifier sur une planche contact et rejeter les détourages ratés.
- BiRefNet a été testé : pas meilleur sur des photos de 500 px, et manque de mémoire.

### Vidéo
- **HyperFrames** CLI `npx -y hyperframes@0.8.181` (`lint`, `snapshot --at T -o dir`, `render . --quality high --fps 30 -o renders/video.mp4`). Composition 1080×1920, timeline GSAP en pause dans `window.__timelines["main"]`. Ne pas animer `top`/`left` (utiliser x/y).
- Après le rendu : remultiplexer l'audio (`bgm.wav`) dans le MP4, puis encoder en crf 18. La version WhatsApp est une copie du fichier crf 18 (deux passes à 5 800k si le grain alourdit le fichier).
- Sources de chaque vidéo : `pitup/videos/<projet>/index.html`. Ressources communes (polices Poppins, logos PitUp, GSAP, grain) : `pitup/shared-assets/`.
- Three.js : r160 (`npm pack three@0.160.0`). Les GLB se chargent par importmap locale. Le rendu 3D logiciel est lent (environ 20 min pour 30 s).

### Audio
- Grille de tempo : `tools/beats_*.py` (recherche du BPM), puis caler la vidéo sur la montée (drop).
- Mixage : musique à 0,4–0,45 (`bass g≈3`), voix décalée de 300 ms à 1,6, loudnorm en deux passes à −13 LUFS (−14 pour une vidéo avec voix calme).
- Placement de la voix : générer **phrase par phrase** avec les horodatages des mots (WordBoundary), puis caler chaque texte à l'écran sur son mot.
- **earshot** (`github.com/Leonxlnx/earshot`, à installer dans un venv avec torch CPU, environ 1,1 Go de modèles) : il **écoute** à ma place. Vérifier chaque son avant de l'envoyer (`realness` donne p_real, `describe`, `timeline`).

### Outils et crédits
- **Higgsfield** : 3,5 crédits restants (plan gratuit). SAM 3D coûte 1 crédit par objet.
- **vidIQ** : 2 crédits (renouvellement le 31 octobre). Une voix vidIQ coûte 14 crédits.
- Compétences installées dans `~/.claude/skills` (à réinstaller dans une nouvelle session) : earshot, real-sound, watch, ad-creative, copywriting, marketing-psychology, creative-director, competitive-ads-extractor, brainstorming, banner-design, poster-hero, design, brand, design-system, ui-ux-pro-max, slides, ui-styling, ecommerce-image-workflow, motion-design, design-motion-principles, emilkowalski-motion, gsap-timeline, frame-logo-outro, threejs, mockup-device-3d, apple-design, context-compression, paywall-upgrade-cro, brand-guidelines, voicestudio, et les 15 compétences de motion design de charlie947/motion-graphics-skills (launch-video, reference-to-motion, motion-effects, reel-export…). Le dépôt aedev-tools/adobe-agent-skills (After Effects) exige un Mac avec After Effects : il n'est pas installable ici. Sources : ui-ux-pro-max-skill, Leonxlnx/earshot, bradautomates/claude-video, nexu-io/open-design, kylezantos/design-motion-principles, LottieFiles/motion-design-skill, dickwu/apple-design-skill, muratcankoylan/Agent-Skills-for-Context-Engineering.

## 6. Idées de campagne retenues (inspirées des grandes marques)

1. **« Le moment du livreur »** (Amazon, Shein) : vraies réactions de clientes à la livraison, avec leur accord. Nécessite des tournages au téléphone.
2. **« Jour PitUp » mensuel** (11.11 d'Alibaba, Jumia) : une date fixe, un compte à rebours, une offre.
3. **« Commande pour… » avec des prénoms** (Coca-Cola « Share a Coke »).
4. **Slogan sonore répété** (Temu, Shopee) : la signature a été mise de côté pour l'instant.
5. **Bilan PitUp de fin d'année** (Spotify Wrapped), uniquement avec de vraies données.
6. **« Shot by PitUp »** (Apple) : les meilleures photos des boutiques.
7. **La vie après la livraison** (Amazon « Joy Ride »).

Le fondateur a choisi les idées 1, 3, 4 et 7 comme vidéos à produire.

## 7. Où sont les fichiers

- **Dans ce dépôt** (`pitup/`) : cette mémoire, les scripts `tools/`, les sources HTML des 26 vidéos, les ressources communes et les visuels du storytelling.
- **Hors dépôt** (perdus à la fin de la session cloud) : les vidéos livrées (MP4), les musiques, les détourages et les GLB. Les livrables ont été envoyés au fondateur.
- Avant de livrer une vidéo : planche contact des captures, earshot sur l'audio, puis envoi en version WhatsApp.

## Mise à jour du 4 novembre (soir) : vidéos produits avec la voix de l'égérie
- **Voix officielle : « voix 3 »**. Style des phrases produits : `(voix douce et posée, chaleureuse, avec le sourire)`.
- **« PitUp » se dit à l'anglaise, d'un trait** (version C validée le 4 novembre) : écrire « PitUp » normalement, avec le style `(voix claire et naturelle, débit normal, avec le sourire)`. « Pite-Eupe » est **refusé** (trop lent, sonne « érotique »). Seule l'adresse du site est épelée : « pé, i, tiret, té, u, pé, point com ».
- « Les articles sélectionnés ne sont pas flatteurs » : choisir des **pièces tendance façon Europe et États-Unis pour les 15-35 ans** (Mary Jane, Samba, Campus, Asics, Shox, TN, sacs type Longchamp ou Coach, Ray-Ban, Kayali, robe en jean, veste en cuir). Toujours montrer une **planche de candidats à valider** avant de traiter.
- **Marques** : autorisées à l'image (logo visible sur la photo). Nom de marque écrit ou dit **seulement pour les sneakers**.
- **Article en plus de 5 variantes** (couleurs ou modèles) : en faire une **vidéo dédiée**. On montre les variantes et le nom de l'article, puis « Retrouve-les sur PitUp, chez [boutique] ». Candidats : Jordan 4 Nigel Sylvester (MB Ephphatha), Mary Jane (Rogatienne), gourdes (Wees fk), huile de parfum (Maella online shopping), Club de Nuit (Natty boutique), casquettes (ETS GOD BLESS), Stanley (Maison Rossa, tenue en main).
- Les autres articles vont dans des vidéos **Pour elle** et **Pour lui**, au format P1 habituel (`tools/build_voix2.py` + `cfg/*.json`).
- **Mix voix (règle du fondateur)** : la musique baisse dès le premier mot et reste très basse (environ −23 dB), **sans remonter entre les phrases**, jusqu'à la fin de la dernière phrase. Elle reprend pleinement sur la carte de fin, avec environ 3,5 s de musique seule (`tools/mix_duck.py`, `gap: 0.5`).
- **Accroche** : « Les pièces tendance d'Europe et des States… sont déjà à Lubumbashi. » / « Les sneakers que tout le monde veut… sont déjà à Lubumbashi. »
- **Prononciation** : « Nike Shox TL » devient « Night Shocks DL ». Dire « Les Nike Shox, en noir. » Écrire « Asiks » pour Asics.
- Musique : Tiakola « Mode de vie » (134 BPM, gros temps à 29,664 s) pour Femme, Blockkids (130 BPM) pour Homme.
- **Piège** : ne jamais mettre en file d'attente avec `while pgrep -f vox_clone_texts`, parce que les lignes de commande des files d'attente se détectent entre elles et bloquent tout.
- **Vidéos dédiées, refusées par le fondateur** : Jordan 4 (« bizarre ») et Mary Jane (déjà traitées). **Réalisée le 4 novembre** : Club de Nuit, 6 parfums chez Natty boutique, sur Tiakola « Cléopâtre » (113 BPM, temps fort à 17,085 s), `cfg/cdn1.json`. Les photos ne se détourent pas (carte ARMAF devant, rayons derrière) : on les présente en **cartes photo arrondies** (`extra_css` dans la config).
- Accroche validée pour Pour elle : « Les pièces tendance du moment… sont déjà à Lubumbashi. » **Ne pas dire « Europe et States ».**
- Prononciation : « Untold » devient « Untold. Couleur bordeaux. », et « Club Night Woman » devient « Et la Club Night Woman. ».
- **Tuto « Créer sa boutique »** (4 novembre) : `tools/build_tuto.py` + `cfg/tuto1.json`. L'égérie vouvoie (« Vous êtes nombreux à nous avoir demandé… »). Le vrai enregistrement d'écran tourne dans une maquette de téléphone, sur 5 étapes, avec un cercle à chaque appui. **Numéro de téléphone flouté.** Retirés : l'erreur réseau, les photos personnelles de la galerie et le message « Vous avez déjà une boutique ». Musique : Kairo Keyz « float 2.0 ». Les segments d'écran sont découpés par ffmpeg (vitesse ×1,6 à ×4).
- **Tuto v2 (retours du fondateur)** : téléphone en **vraie 3D** (tranche en titane faite de couches CSS, boutons, vitre avec reflet, rotation à chaque étape). **Pas trop de sauts** : vitesse ×1 à ×2, un seul flux d'écran continu avec des fondus (`tools/tuto_master.py`). **Numéro de téléphone visible**, pas flouté (choix du fondateur). Bannière : logo ETS Blessing incrusté dans le champ « Bannière », en entier, sur fond blanc.
- **Jet Lag (Tiakola et Jorja Smith)** : la voix parlée au début (« À courir derrière la prospérité… », de 0 à 7 s) et l'intro **ne sont pas à garder**. Tiakola commence à **16,5 s** (« Je suis dans un rêve… ») ; le beat tombe à 15,0 s, à 120 BPM. Démarrer le morceau à 16,5 s. Utilisé pour le tuto boutique.
- **Transcription** : sur certaines machines, whisper de hyperframes plante (SIGILL). Solution de secours : faster-whisper dans le venv `/home/user/fw` (modèle small, int8), avec l'audio lu par soundfile.
- **5 novembre** : vidéo « PitUp, c'est quoi ? » (`tools/build_quoi.py`, 9 scènes animées : Lubumbashi, problème acheteur, problème vendeur, téléphone 3D, Tu achètes ?, Tu vends ?, +100, appli ou site, drapeau de la RDC), sur Raindance à partir de 13,3 s. Vidéo boutique « Wees fk en lumière » (`cfg/weesfk.json`, format P1), sur Coco à partir de 12,106 s (93,46 BPM). Dans le lot « Yara » (337), la bouteille noire est une **Asad** et non une Yara.
- **Prononciation** : « Wees fk » s'écrit « Wiz, èf, ka ». Ne jamais commencer une phrase par « PitUp » (elle dit « Pitop ») : écrire « bienvenue sur PitUp » ou « sur PitUp ». Pour « tu commandes, on te livre », écrire des phrases courtes séparées par des points. Pour les noms de parfums difficiles (Badée al Oud), dire « un parfum oud » et afficher le vrai nom à l'écran. Faire 3 prises d'une phrase délicate et garder celle que la transcription reconnaît.
- **Vérification de la voix** : faster-whisper `medium`, avec `initial_prompt` pour les noms propres.
- **Disque plein** : les renders intermédiaires (`hf/videos/*/renders`) et les caches pip/uv se suppriment ; les livrables restent dans `livrables/`.
- **Public : jeunes noirs africains (RDC).** Toute personne visible à l'écran doit être noire africaine. Refuser les plans de stock avec des personnes non africaines ou des décors étrangers (montagne enneigée, marché européen).
- **Le fondateur veut de vraies images, pas du graphisme** : un vrai téléphone en main, une vraie carte ou une vue satellite de Lubumbashi, de vraies boutiques. Sources utilisées :
  - satellite Esri (avec crédit) et plan OpenStreetMap (avec crédit) via `tools/mapzoom.py` ;
  - photos des boutiques partenaires prises dans le catalogue de l'API ;
  - vraies captures de pi-tup.com via Playwright (`/marketplace` montre les boutiques, sans prix) ;
  - vidéos libres Mixkit (gratuites, usage commercial permis), uniquement avec des personnes noires ;
  - vidéo de rues de Lubumbashi envoyée par le fondateur, signée « DJEUDY / @djeudy243 » : **son accord est à confirmer avant publication**.
  Pexels, Pixabay et Wikimedia sont bloqués depuis le conteneur.
- La page `/shopping` du site affiche les prix : ne pas l'utiliser.
- **Règle du fondateur (redite deux fois)** : **l'appli et le site apparaissent toujours dans un téléphone 3D**, jamais à plat en plein écran. Le site sur ordinateur apparaît dans un **ordinateur portable 3D** avec la **vraie page `/marketplace`** qui défile (la page d'accueil « Pour vous » n'est pas représentative). Voir `tools/build_quoi3.py` : téléphone et ordinateur en 3D placés à la racine du document, ce qui permet de mettre des vidéos sur l'écran du téléphone.
- Vidéo de DJEUDY : accord confirmé. **Aucun flou ni aucun nom dans une pub** (règle du fondateur) : la signature « Directed by DJEUDY » et le badge « @djeudy243 » sont **effacés et le décor reconstruit** avec LaMa (`tools/lama_wm.py` et `tools/lama_clip.py` ; modèle ONNX dans `/root/.cache/lama/lama.onnx`, à retélécharger depuis HF `Carve/LaMa-ONNX`). Ne jamais utiliser `delogo` ni le flou.
- **5 novembre** : « PitUp, c'est quoi ? » v4 **validée** (« C'est bon, on passe »).
