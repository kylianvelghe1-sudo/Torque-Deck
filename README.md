# Torque Deck : serveur

Jeu de cartes de voitures avec comptes joueurs, paquets, points, recyclage et échanges.
Aucune dépendance à installer : il faut seulement Node.js 18 ou plus récent.

## Lancer

    node server.js

Puis ouvre http://localhost:3000. Chaque joueur crée un compte (pseudo + mot de passe) et reçoit 10 paquets.

## Variables d'environnement

| Variable | Rôle | Défaut |
|---|---|---|
| `ADMIN_PASSWORD` | Code de la page Admin. À définir avant la mise en ligne | `1188` |
| `PORT` | Port du serveur | `3000` |
| `DATA_DIR` | Dossier des données (comptes, offres, photos) | `./data` |
| `TRUST_PROXY` | `1` derrière un proxy HTTPS (Nginx, Render, Railway...) | `0` |
| `COOKIE_SECURE` | `1` pour forcer les cookies en HTTPS | `0` |
| `TRADE_DUPLICATES_ONLY` | `0` pour autoriser l'échange de n'importe quelle carte | `1` (doublons seulement) |
| `PACK_INTERVAL_MIN` | Minutes entre deux paquets gratuits | `10` |
| `MAX_PACKS` | Stock maximum de paquets gratuits | `10` |

Exemple : `ADMIN_PASSWORD=monCode TRUST_PROXY=1 node server.js`

## Mise en ligne

- Il faut un hébergeur qui fait tourner Node.js (Render, Railway, Fly.io, un petit serveur VPS...).
- Les données sont dans `DATA_DIR`. Sur un hébergeur dont le disque est temporaire, monte un volume persistant et pointe `DATA_DIR` dessus, sinon les comptes disparaissent à chaque redémarrage.
- Mets le site derrière HTTPS et définis `TRUST_PROXY=1`.
- Sauvegarde : copie le dossier `DATA_DIR`.

## Règles du jeu

- 100 voitures, 6 raretés déterminées par la valeur : commune, peu commune, rare, super-rare, ultra-rare, légendaire.
- Un paquet = 5 voitures différentes, dont au moins une rare ou mieux. Un paquet gratuit toutes les 10 minutes, jusqu'à 10 en stock.
- **Recyclage** : un doublon rapporte 5 / 12 / 30 / 75 / 200 / 500 points selon la rareté. Il reste toujours un exemplaire.
- **Paquet** : 250 points. Les paquets achetés peuvent dépasser le stock de 10.
- **Échanges** : offre publique sur le marché ou proposition directe à un joueur. Seuls les doublons se donnent. Un échange réussi rapporte 2 / 4 / 8 / 15 / 30 / 60 points selon la rareté de la carte donnée, pour 5 échanges par jour et par joueur.
- Les valeurs des points se règlent dans `public/data.js` (objet `ECON`). Les cartes se trouvent dans le même fichier (`RAW`), leurs descriptions dans `public/desc.js`. Ajouter une carte à la fin de `RAW` ne change pas les numéros existants.

## Admin

Page `#admin` : code d'accès, liste des joueurs (+1 paquet, remise à 10, +10 min, +100 points, vider la collection), réinitialisation des paquets de tous, annulation des offres, et envoi de photos réelles de voitures qui remplacent les dessins sur les cartes pour tous les joueurs.
