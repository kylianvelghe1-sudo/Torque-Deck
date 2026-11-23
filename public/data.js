/* ---------- Données ---------- */
const COL = {rouge:'#d4302b',bleu:'#2b6fd6',jaune:'#f0bd1a',vert:'#2f8a52',noir:'#24262c',blanc:'#ecebe6',argent:'#b9c0c8',orange:'#ee7a1c',gris:'#6e7681'};
const RAR = [
  {k:'commune',n:'Commune',c:'#9ba5b0',w:38,range:'moins de 15 000 €'},
  {k:'peu',n:'Peu commune',c:'#4fc38a',w:27,range:'15 000 à 45 000 €'},
  {k:'rare',n:'Rare',c:'#3f9cf0',w:20,range:'45 000 à 130 000 €'},
  {k:'super',n:'Super-rare',c:'#a46bff',w:9,range:'130 000 à 450 000 €'},
  {k:'ultra',n:'Ultra-rare',c:'#ff4fa0',w:4.5,range:'450 000 € à 1,5 M€'},
  {k:'legend',n:'Légendaire',c:'#ffc83d',w:1.5,range:'plus de 1,5 M€'}
];
const THRESH = [15000,45000,130000,450000,1500000];
const rarityOf = v => THRESH.filter(t => v >= t).length;

// b marque, m modèle, y année, c couleur, t carrosserie, v valeur (€), hp ch, km km/h, tg phrase
const RAW = [
 ['Citroën','2CV',1975,'jaune','hatch',9000,29,115,'La reine des chemins de campagne.'],
 ['Renault','4L',1978,'bleu','hatch',7000,34,120,'Le fidèle compagnon de toute une génération.'],
 ['Volkswagen','Coccinelle',1969,'vert','beetle',14000,50,120,'Une bouille ronde, un moteur à l\'arrière.'],
 ['Peugeot','106 XT',1996,'rouge','hatch',3500,60,160,'La citadine nerveuse des années 90.'],
 ['Fiat','Panda',1990,'blanc','hatch',4000,45,140,'Petite, carrée et increvable.'],
 ['Renault','Twingo',1998,'orange','hatch',3000,55,150,'Le sourire sur quatre roues.'],
 ['Mini','Austin Mini',1971,'rouge','hatch',13000,40,115,'Compacte, maline, devenue légende.'],
 ['Opel','Corsa',2004,'gris','hatch',2800,75,170,'La voiture de tous les premiers permis.'],
 ['Ford','Fiesta',2008,'bleu','hatch',5500,82,175,'Polyvalente et facile à vivre.'],
 ['Dacia','Sandero',2015,'blanc','hatch',6500,75,165,'Le choix malin du juste prix.'],

 ['Peugeot','205 GTI',1988,'rouge','hatch',28000,115,195,'La petite sportive qui a fait rêver la France.'],
 ['Volkswagen','Golf GTI',1984,'noir','hatch',22000,112,190,'Celle qui a inventé la compacte sportive.'],
 ['Mazda','MX-5',1993,'bleu','roadster',18000,115,195,'Le plaisir de conduire cheveux au vent.'],
 ['Renault','Clio Williams',1994,'bleu','hatch',30000,150,215,'Bleu sport, caractère explosif.'],
 ['Citroën','Méhari',1980,'orange','suv',22000,29,100,'Plastique, plage et bonne humeur.'],
 ['Jeep','Wrangler TJ',1996,'vert','suv',19000,190,160,'Prête pour tous les chemins.'],
 ['Volvo','240 Break',1990,'blanc','wagon',17000,114,170,'Le break qui ne meurt jamais.'],
 ['Honda','Civic Type R',1998,'blanc','hatch',38000,185,225,'Un moteur qui adore monter dans les tours.'],
 ['Fiat','500 Abarth',1967,'jaune','hatch',40000,28,120,'Petit scorpion, grand caractère.'],

 ['Porsche','911 (964)',1991,'argent','coupe',85000,250,260,'L\'icône à moteur arrière, version moderne.'],
 ['BMW','M3 E30',1989,'blanc','coupe',95000,200,235,'Née pour la piste, adoptée par la rue.'],
 ['Alfa Romeo','Spider Duetto',1969,'rouge','roadster',45000,109,185,'L\'élégance italienne, toit ouvert.'],
 ['Ford','Mustang Fastback',1967,'vert','coupe',90000,289,200,'Le poney sauvage de l\'Amérique.','#ecebe6'],
 ['Chevrolet','Camaro SS',1969,'orange','coupe',80000,300,210,'Du muscle, du bruit, de la gomme.','#24262c'],
 ['Mercedes-Benz','190E 2.5-16',1990,'noir','sedan',60000,204,235,'La berline qui chassait les sportives.'],
 ['Lancia','Delta Integrale',1992,'bleu','hatch',70000,210,220,'Reine du rallye, six titres mondiaux.'],
 ['Toyota','Supra A80',1996,'orange','coupe',110000,330,285,'Le six-cylindres le plus célèbre du Japon.',null,1],
 ['Nissan','Skyline GT-R R32',1993,'gris','coupe',60000,280,250,'Surnommée Godzilla.'],
 ['Land Rover','Defender 90',1995,'vert','suv',55000,111,130,'Taillée pour l\'aventure, sans compromis.'],
 ['Volkswagen','Combi T1',1965,'bleu','van',75000,44,105,'Le van de l\'été éternel.','#ecebe6'],
 ['Ford','F-100',1956,'rouge','pickup',60000,130,130,'Le pick-up au charme d\'autrefois.'],
 ['Alpine','A110 1600S',1972,'bleu','coupe',120000,138,210,'Légère comme une plume, vive comme l\'éclair.'],

 ['Jaguar','E-Type S1',1966,'vert','roadster',180000,265,240,'Souvent citée comme la plus belle du monde.'],
 ['Porsche','911 Carrera RS 2.7',1973,'blanc','coupe',350000,210,245,'Le célèbre « ducktail » est né ici.','#d4302b',1],
 ['Ferrari','308 GTS',1980,'rouge','coupe',130000,240,250,'Le cheval cabré sous le soleil.'],
 ['Porsche','911 Turbo 930',1986,'noir','coupe',160000,300,260,'Le turbo au caractère explosif.',null,1],
 ['Lamborghini','Urus',2020,'jaune','suv',230000,650,305,'Le super SUV qui a dompté le taureau.'],
 ['Mercedes-AMG','G 63',2022,'noir','suv',190000,585,220,'Le tout-terrain devenu icône de luxe.'],
 ['Bentley','Continental GT',2018,'bleu','coupe',200000,635,333,'Le luxe britannique lancé à pleine vitesse.'],
 ['Chevrolet','Corvette Stingray',1963,'argent','coupe',200000,360,230,'Le split-window, un seul millésime.'],
 ['Ferrari','F355 Berlinetta',1997,'jaune','coupe',130000,380,295,'Un V8 qui chante jusqu\'à 8 500 tr/min.'],

 ['Lamborghini','Countach 5000 QV',1988,'blanc','super',500000,455,295,'Des portes en ciseaux, une silhouette de fusée.',null,1],
 ['Porsche','959',1987,'argent','coupe',900000,450,317,'Vitrine technologique devenue mythe.'],
 ['Aston Martin','DB5',1964,'argent','coupe',1000000,282,233,'L\'élégance d\'un agent très secret.'],
 ['Ferrari','Dino 246 GT',1970,'jaune','coupe',700000,195,235,'Petite Ferrari, immense talent.'],
 ['Porsche','Carrera GT',2005,'gris','roadster',1200000,612,330,'Un V10 de course, une rareté absolue.'],
 ['Bugatti','Veyron 16.4',2008,'bleu','super',1400000,1001,407,'Le premier hypercar de 1 000 chevaux.',null,1],

 ['Mercedes-Benz','300 SL Gullwing',1955,'argent','coupe',1800000,215,260,'Ses portes papillon ont marqué l\'histoire.'],
 ['Ferrari','F40',1989,'rouge','super',2400000,478,324,'La dernière Ferrari voulue par Enzo.',null,1],
 ['Lamborghini','Miura SV',1971,'orange','super',2200000,385,290,'La mère de toutes les supercars.'],
 ['McLaren','F1',1994,'orange','super',20000000,627,386,'Record du monde de vitesse en 1998.'],
 ['Ferrari','250 GTO',1962,'rouge','coupe',50000000,300,280,'Le Graal absolu des collectionneurs.'],
 ['Bugatti','Chiron Super Sport',2021,'bleu','super',3900000,1600,440,'Pensée pour franchir les 440 km/h.','#24262c',1],

 ['Peugeot','Saxo VTS',1999,'jaune','hatch',6000,120,200,'Petite, nerveuse et surprenante.'],
 ['Renault','Clio RS',2002,'jaune','hatch',12000,172,220,'Un châssis qui adore les virages.'],
 ['Smart','Fortwo',2005,'jaune','hatch',4000,61,135,'Deux places, zéro souci de parking.'],
 ['Suzuki','Jimny',2012,'vert','suv',11000,85,140,'Un mini 4x4 qui passe partout.'],
 ['Skoda','Octavia Combi',2008,'argent','wagon',6500,105,188,'Le break qui avale les valises.'],
 ['Mini','Cooper S',2005,'rouge','hatch',7000,163,225,'Le kart du quotidien.'],
 ['Ford','Focus ST',2006,'bleu','hatch',13000,225,240,'Cinq cylindres et caractère trempé.'],
 ['Toyota','Yaris',2006,'argent','hatch',4500,87,175,'La fiabilité avant tout.'],

 ['Renault','Super 5 GT Turbo',1989,'rouge','hatch',18000,120,200,'Le petit turbo qui secoue.'],
 ['Mazda','RX-7 FD',1995,'rouge','coupe',42000,255,250,'Un rotatif qui tourne comme une turbine.'],
 ['Subaru','Impreza WRX STI',2004,'bleu','sedan',25000,265,240,'Bleu rallye, intégrale et gros aileron.'],
 ['Mitsubishi','Lancer Evo VI',1999,'blanc','sedan',40000,280,250,'La reine des spéciales de rallye.','#d4302b'],
 ['Porsche','944 Turbo',1987,'rouge','coupe',30000,220,245,'Le transaxle qui aime les virages.'],
 ['Lotus','Elise S1',1997,'jaune','roadster',32000,118,200,'Moins de 800 kg, plaisir maximum.'],
 ['Citroën','DS 21',1968,'blanc','sedan',35000,109,175,'La Déesse venue du futur.'],
 ['Volkswagen','Karmann Ghia',1969,'bleu','coupe',30000,50,125,'Silhouette italienne sur base de Coccinelle.'],
 ['Triumph','TR6',1973,'vert','roadster',25000,150,190,'Un six-cylindres et le vent dans les cheveux.'],

 ['Ford','Escort RS Cosworth',1993,'bleu','hatch',75000,227,232,'Un aileron géant, un turbo qui frappe.'],
 ['Audi','RS2 Avant',1994,'bleu','wagon',75000,315,262,'Un break signé Porsche.'],
 ['Mercedes-Benz','280 SL Pagode',1968,'argent','roadster',110000,170,200,'Le toit en creux le plus célèbre.'],
 ['Citroën','SM',1972,'bleu','coupe',60000,170,220,'Moteur Maserati, âme Citroën.'],
 ['Honda','NSX',1991,'rouge','super',100000,270,270,'La supercar japonaise fiable.'],
 ['Nissan','Skyline GT-R R34',1999,'bleu','coupe',120000,280,250,'La Godzilla bleue de Bayside.'],
 ['BMW','2002 Turbo',1973,'blanc','coupe',110000,170,211,'Premier turbo de série en Europe.'],
 ['Porsche','911 SC',1980,'noir','coupe',75000,204,235,'Le flat six de 3 litres.'],
 ['De Tomaso','Pantera',1972,'jaune','super',110000,330,260,'Design italien, V8 américain.'],

 ['Ferrari','Testarossa',1987,'rouge','super',200000,390,290,'Des branchies devenues légendaires.'],
 ['Lamborghini','Diablo VT',1993,'jaune','super',250000,492,325,'Un taureau à quatre roues motrices.'],
 ['Lamborghini','Murciélago LP640',2006,'orange','super',240000,640,340,'Un V12 de 6,5 litres derrière le dos.'],
 ['Ferrari','458 Italia',2010,'rouge','super',190000,570,325,'Un V8 qui hurle jusqu\'à 9 000 tr/min.'],
 ['Mercedes-Benz','SLS AMG',2010,'argent','coupe',200000,571,317,'Des portes papillon modernes.'],
 ['Ford','GT',2005,'bleu','super',400000,550,330,'La GT40 revisitée.','#ee7a1c'],
 ['Porsche','356 Speedster',1956,'argent','roadster',350000,60,160,'Le pare-brise bas de l\'été.'],
 ['Lamborghini','Gallardo',2005,'vert','super',135000,500,309,'Le taureau qui a fait fortune.'],

 ['Ferrari','365 GTB/4 Daytona',1969,'jaune','coupe',800000,352,280,'Le V12 avant à son sommet.'],
 ['Shelby','Cobra 427',1966,'bleu','roadster',1300000,425,265,'7 litres dans une caisse minuscule.','#ecebe6'],
 ['BMW','M1',1979,'blanc','super',550000,277,262,'La BMW à moteur central.'],
 ['Toyota','2000GT',1967,'blanc','coupe',900000,150,220,'La première supercar du Japon.'],
 ['Jaguar','XJ220',1992,'argent','super',700000,542,341,'La plus rapide de son époque.'],
 ['Lancia','Stratos HF Stradale',1974,'orange','super',700000,190,232,'Une fusée de rallye en forme de coin.'],

 ['Ferrari','Enzo',2002,'rouge','super',3000000,660,350,'Nommée d\'après le fondateur.'],
 ['McLaren','P1',2014,'orange','super',2000000,916,350,'Hybride de 916 chevaux.'],
 ['Porsche','918 Spyder',2013,'argent','super',1900000,887,345,'Hybride et record au Nürburgring.'],
 ['Ferrari','LaFerrari',2013,'rouge','super',3500000,963,350,'Le premier hybride de la marque.'],
 ['Koenigsegg','Agera RS',2017,'blanc','super',2500000,1360,447,'Record du monde de vitesse en 2017.'],
 ['Pagani','Huayra',2012,'argent','super',2600000,730,383,'Carbone, titane et V12 biturbo.'],
 ['Ferrari','288 GTO',1984,'rouge','super',3200000,400,305,'L\'ancêtre de la F40.']
];
// Les 53 premières voitures gardent leurs numéros d'origine, les nouvelles prennent la suite (54, 55...).
const BASE = 53;
const mkCar = r => ({b:r[0],m:r[1],y:r[2],cn:r[3],hx:COL[r[3]],t:r[4],v:r[5],hp:r[6],km:r[7],tg:r[8],st:r[9]||null,sp:!!r[10]});
const byValue = (a,b) => a.v-b.v;
const CARS = [...RAW.slice(0,BASE).map(mkCar).sort(byValue), ...RAW.slice(BASE).map(mkCar).sort(byValue)]
  .map((c,i)=>({...c,id:i+1,r:rarityOf(c.v)}));
const SORTED = [...CARS].sort((a,b)=>a.v-b.v || a.id-b.id);
// Points : valeur d'un doublon recyclé, bonus d'échange (selon la rareté de la carte donnée), prix d'un paquet
const ECON = {packPrice:250, recycle:[5,12,30,75,200,500], tradeBonus:[2,4,8,15,30,60], tradeCap:5};
const BYR = RAR.map((_,i)=>CARS.filter(c=>c.r===i));
const BYID = Object.fromEntries(CARS.map(c=>[c.id,c]));

const eraLabel = y => { const d=Math.floor(y/10)*10; return d<2000 ? 'Années '+(d-1900) : 'Années '+d; };
const fmtV = v => v>=1e6 ? (v/1e6).toLocaleString('fr-FR',{maximumFractionDigits:1})+' M€' : v.toLocaleString('fr-FR')+' €';
const pad3 = n => String(n).padStart(3,'0');
