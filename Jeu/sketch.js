/*
 * 👋 Hello! This is an ml5.js example made and shared with ❤️.
 * Learn more about the ml5.js project: https://ml5js.org/
 * ml5.js license and Code of Conduct: https://github.com/ml5js/ml5-next-gen/blob/main/LICENSE.md
 *
 * This example demonstrates ing skeletons on poses for the MoveNet model.
 */

let video;
let bodyPose;
let poses = [];
let connections;
let previousPose = null;
let squatInProgress = false;
let squatCount = 10; // Nombre de squats effectués
let minHipY = 999999; // Pour suivre la position la plus basse
let maxHipY = 0; // Pour suivre la position la plus haute
let squatStartTime = 0; // Pour tracker le temps de la descente
let levelStarted = false;

// Variables pour le tir
let cannonPos; // Point A - Position fixe du canon
let projectiles = []; // Liste des projectiles tirés
let canShoot = true; // Pour éviter le tir en rafale
let floorSprite; // Sprite pour le sol
let frondeSprite; // Sprite pour le lance-pierre
let boisSprites = []; // Tableau de tous les sprites de bois
let boisImg; // Image SVG du bois
let enemyImg; // Image de l'ennemi
let alliesImg; // Image de l'allié

// Variables pour la détection de main
let handPose;
let hands = [];
let modelsLoaded = false;


// Variable de jeu
let level = 3;
let life = 1;
let ennemies = [];
let allies = [];

function preload() {
  // Load the bodyPose model
  bodyPose = ml5.bodyPose();
  // Load the handPose model (sans options de dessin automatique)
  handPose = ml5.handPose({ flipped: false });
  // Charger l'image SVG du bois
  boisImg = loadImage('../assets/bois.svg');
  ammoImg = loadImage('../assets/picon_ammo.svg');
  // Ciel. Tu m'avais pas dit qu'elle puait la merde.
  bgImg = loadImage('../assets/background.svg');
  // Sol ///////////////////////////////////////////////////////////////////////////////////////////////
  floorImg = loadImage('../assets/1er-plan.svg');
  // Fronde
  frondeImg = loadImage('../assets/fronde.svg');
  enemyImg = loadImage('../assets/Saucisson.svg');
  alliesImg = loadImage('../assets/Allie.svg');

}

function setup() {
  // Créer le canvas en plein écran
  createCanvas(windowWidth, windowHeight);

  // Create the video and hide it
  video = createCapture(VIDEO);
  video.size(640, 480); // Taille pour la capture (ml5 détectera sur cette résolution)
  video.hide();

  // Sprite visuel (le SVG)
  let floorSprite = new Sprite(width / 2, height / 2 + 275, 0, 0, 'static');
  floorSprite.img = floorImg;
  floorSprite.collider = "none"; // pas de hitbox sur l'image

  // Hitbox 1
  let hit1 = new Sprite(width / 2 - 700, height / 2 + 250, 500, 300, 'static');
  hit1.color = color(0, 0, 0, 0); // invisible
  hit1.stroke = color(0, 0, 0, 0);

  let hit3 = new Sprite(width / 2 + 1000, height / 2 + 250, 80, 1000, 'static');
  hit3.color = color(0, 0, 0, 0); // invisible
  hit3.stroke = color(0, 0, 0, 0);
  

  // Hitbox 2
  let hit2 = new Sprite(width / 2, height / 2 + 500, 2500, 300, 'static');
  hit2.color = color(0, 0, 0, 0); // invisible
  hit2.stroke = color(0, 0, 0, 0);
  
  // Initialiser la position du canon (centre gauche de l'écran) EN PREMIER
  cannonPos = createVector(150, height - 400);
  
  // Créer le sprite de la fronde une seule fois APRÈS cannonPos
  frondeSprite = new Sprite(cannonPos.x, cannonPos.y, 180, 180, 'static');
  frondeSprite.scale = 0.5;
  frondeSprite.img = frondeImg;
  frondeSprite.collider = "none"; // pas de hitbox
  frondeSprite.layer = 10; // Au dessus des autres sprites

  // Start detecting poses in the webcam video
  bodyPose.detectStart(video, gotPoses);
  // Start detecting hands from the webcam video
  handPose.detectStart(video, gotHands);
  // Get the skeleton connection information
  connections = bodyPose.getSkeleton();

  // Créer le sprite du sol

  // // Attendre que l'image soit chargée avant de créer le château
  // if(boisImg.width > 0){
  //   setupLevel1();
  // }

  modelsLoaded = true;
  world.gravity.y = 10;
}

function setBoisVertical(x, y) {
  let bois = new Sprite(x, y, boisImg.width, boisImg.height, 'd');
  if (boisImg && boisImg.width > 0) {
    bois.img = boisImg;
  } else {
    bois.color = color(139, 69, 19); // Marron si pas d'image
  }
  bois.rotation = 0;
  bois.mass = 0.5;
  bois.bounciness = 0.3;
  return bois;
}

function setBoisHorizontal(x, y) {
  let bois = new Sprite(x, y, boisImg.width, boisImg.height, 'd');
  if (boisImg && boisImg.width > 0) {
    bois.img = boisImg;
  }
  bois.rotation = 90;
  bois.mass = 0.5;
  return bois;
}

function setupLevel1() {
  // Créer un château avec plusieurs étages
  let centerX = width / 2 + 500;
  let baseY = height - 295;

  // Base: 2 piliers verticaux
  boisSprites.push(setBoisVertical(centerX - 79, baseY));
  boisSprites.push(setBoisVertical(centerX + 79, baseY));

  // Premier étage: plateforme horizontale
  boisSprites.push(setBoisHorizontal(centerX, baseY - 80));

  // Rajout de l'énemies
  addEnemies(width / 2 + 500, height - 400);


}


function setupLevel2() {
  // Créer un château avec plusieurs étages
  let centerX = width / 2 + 500;
  let baseY = height - 295;

  // Base: 2 piliers verticaux
  boisSprites.push(setBoisVertical(centerX - 79, baseY));
  boisSprites.push(setBoisVertical(centerX + 79, baseY));

  // Premier étage: plateforme horizontale
  boisSprites.push(setBoisHorizontal(centerX, baseY - 80));

  // Rajout de l'énemies
  addEnemies(width / 2 + 500, height - 400);
  addEnemies(width / 2 + 500, height - 200);
}

function setupLevel3() {

  // Créer un château avec plusieurs étages
  let centerX = width / 2 + 500;
  let baseY = height - 295;

  // Base: 2 piliers verticaux
  boisSprites.push(setBoisVertical(centerX - 79, baseY));
  boisSprites.push(setBoisVertical(centerX + 79, baseY));

  // Premier étage: plateforme horizontale
  boisSprites.push(setBoisHorizontal(centerX, baseY - 80));

  // Rajout de l'énemies
  addEnemies(width / 2 + 500, height - 400);
  addEnemies(width / 2 + 500, height - 200);
  addAllies(width / 2 + 300, height - 200);
}


function addEnemies(x, y) {
  // Ajouter des ennemis (cercles rouges) sur le château
  let enemy = new Sprite(x, y, 150, 150);
  enemy.scale = 0.7;
  enemy.color = color(255, 0, 0);
  enemy.img = enemyImg;
  enemy.mass = 1;
  ennemies.push(enemy);
}

function addAllies(x, y) {
  // Ajouter des alliés (cercles verts) sur le château
  let ally = new Sprite(x, y, 150, 150);
  ally.scale = 0.5;
  ally.color = color(0, 255, 0);
  ally.img = alliesImg;
  ally.mass = 1;
  allies.push(ally);
}




function windowResized() {
  // Adapter le canvas à la nouvelle taille de la fenêtre
  resizeCanvas(windowWidth, windowHeight);
  // Mettre à jour la position du canon
  cannonPos = createVector(150, height - 150);
  // Mettre à jour le sprite du sol
  if (floorSprite) {
    floorSprite.x = width / 2;
    floorSprite.y = height - 100;
    floorSprite.width = width;
  }
}

function draw() {
  // Dessiner le background en premier
  image(bgImg, 0, 0, width, height);
  
  // Message de chargement si les modèles ne sont pas prêts
  if (!modelsLoaded) {
    fill(255);
    textSize(32);
    textAlign(CENTER);
    text("Chargement des modèles...", width / 2, height / 2);
    return;
  }

  // Mettre à jour les projectiles (p5play les dessine automatiquement)
  updateProjectiles();
  updateLevel();


  // Gérer la détection
  if (poses.length > 0) {
    squatDetected();
  }

  // Dessiner le canon APRES les sprites pour qu'il soit visible
  drawCannon();

  // Gérer le tir
  shoot();

  // Dessiner l'environnement de jeu (UI) PAR DESSUS tout
  drawGameEnvironment();
  
  // Dessiner la miniature caméra en haut à droite (DERNIER pour être au dessus)
  drawCameraMiniature();
}

function drawGameEnvironment() {




  // Afficher les infos de jeu
  fill(255);
  textSize(24);
  textAlign(LEFT);
  noStroke();
  image(ammoImg, 20, 20, 24, 24);
  text(" x" + squatCount, 50, 40);
  text("Ennemies: " + ennemies.length, 20, 70);
  text("Level: " + level, 20, 100);
}

function drawCameraMiniature() {
  // Position en haut à droite
  let miniW = 320;
  let miniH = 240;
  let miniX = width - miniW - 20;
  let miniY = 20;

  // Dessiner la vidéo en miroir
  push();
  translate(miniX + miniW, miniY);
  scale(-1, 1);
  image(video, 0, 0, miniW, miniH);

  // Dessiner le squelette par-dessus
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];

    // Facteur d'échelle pour adapter les coordonnées à la miniature
    // ml5 détecte sur la taille de la vidéo (640x480)
    let scaleX = miniW / 640;
    let scaleY = miniH / 480;

    // Connexions du squelette
    for (let j = 0; j < connections.length; j++) {
      let pointAIndex = connections[j][0];
      let pointBIndex = connections[j][1];
      let pointA = pose.keypoints[pointAIndex];
      let pointB = pose.keypoints[pointBIndex];

      if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
        stroke(0, 255, 0);
        strokeWeight(2);
        line(pointA.x * scaleX, pointA.y * scaleY, pointB.x * scaleX, pointB.y * scaleY);
      }
    }

    // Points clés du squelette (petits points rouges)
    for (let j = 0; j < pose.keypoints.length; j++) {
      let keypoint = pose.keypoints[j];
      if (keypoint.confidence > 0.1) {
        fill(255, 0, 0);
        noStroke();
        circle(keypoint.x * scaleX, keypoint.y * scaleY, 4);
      }
    }
  }

  // Dessiner UN seul point pour la main détectée
  if (hands.length > 0) {
    let hand = hands[0];
    let wrist = hand.keypoints[0]; // Seulement le poignet
    let scaleX = miniW / 640;
    let scaleY = miniH / 480;

    fill(0, 255, 255); // Cyan pour la main dans la miniature
    noStroke();
    circle(wrist.x * scaleX, wrist.y * scaleY, 8);
  }

  pop();

  // Cadre autour de la miniature
  noFill();
  stroke(255);
  strokeWeight(3);
  rect(miniX, miniY, miniW, miniH);
}

function squatDetected() {
  if (poses.length > 0) {
    let pose = poses[0];
    let leftKnee = pose.keypoints[13];
    let rightKnee = pose.keypoints[14];
    let leftHip = pose.keypoints[11];
    let rightHip = pose.keypoints[12];
    let leftAnkle = pose.keypoints[15];
    let rightAnkle = pose.keypoints[16];

    if (leftKnee.confidence > 0.2 && rightKnee.confidence > 0.2 &&
      leftHip.confidence > 0.2 && rightHip.confidence > 0.2 &&
      leftAnkle.confidence > 0.2 && rightAnkle.confidence > 0.2) {

      // Position moyenne des hanches (plus Y est grand, plus on est bas)
      let avgHipY = (leftHip.y + rightHip.y) / 2;

      // Mise à jour des extremums avec lissage
      if (!squatInProgress) {
        // Quand on est debout, on met à jour la position haute
        if (avgHipY < maxHipY || maxHipY === 0) {
          maxHipY = avgHipY;
        }
      }

      // Vérifier si on a une pose précédente
      if (previousPose) {
        let prevLeftHip = previousPose.keypoints[11];
        let prevRightHip = previousPose.keypoints[12];
        let prevAvgHipY = (prevLeftHip.y + prevRightHip.y) / 2;

        // Calculer le mouvement vertical des hanches
        let hipMovement = avgHipY - prevAvgHipY;

        text("Hip Movement: " + Math.round(hipMovement), 10, height - 100);

        // Descente: les hanches descendent (Y augmente)
        // On détecte quand les hanches descendent significativement
        if (hipMovement > 3 && !squatInProgress) {
          // Commencer à détecter la descente
          if (avgHipY > maxHipY + 35) { // Descente d'au moins 35 pixels
            squatInProgress = true;
            minHipY = avgHipY;
            squatStartTime = millis(); // Enregistrer le temps de début
            console.log("🔽 DESCENTE détectée! Hip Y: " + Math.round(avgHipY));
            fill(0, 255, 0);
            text("🔽 DESCENTE", width / 2 - 50, height / 2);
          }
        }
        // Montée: les hanches remontent (Y diminue)
        else if (hipMovement < -3 && squatInProgress) {
          // Vérifier qu'on remonte après être descendu
          if (avgHipY < minHipY - 20) { // Remontée d'au moins 20 pixels
            squatCount++;
            squatInProgress = false;
            maxHipY = avgHipY; // Réinitialiser la position haute

          }
        }

        // Timeout: si en descente depuis plus de 2 secondes, annuler
        if (squatInProgress && millis() - squatStartTime > 2000) {
          console.log("⚠️ Timeout squat - Réinitialisation");
          squatInProgress = false;
          maxHipY = avgHipY;
        }

        // Afficher l'état
        if (squatInProgress) {
          fill(255, 150, 0);
          textSize(16);
          text("🔽 EN DESCENTE", 10, 30);

        }
      }
    }
    previousPose = pose;
  }
}

function drawCannon() {
  // Le sprite de la fronde est déjà créé dans setup, on met juste à jour sa position si nécessaire
  if(frondeSprite) {
    frondeSprite.x = cannonPos.x;
    frondeSprite.y = cannonPos.y;
  }

  // Ligne de visée vers le poignet GAUCHE détecté (depuis bodyPose)
  if (poses.length > 0) {
    let pose = poses[0];
    let wrist = pose.keypoints[9]; // Index 9 = left_wrist dans MoveNet

    if (wrist.confidence > 0.3) {
      // Sensibilité réduite 2.5x : plage plus large pour plus de contrôle
      let centerX = 320; // Centre de 640
      let centerY = 240; // Centre de 480
      let rangeX = 256; // 640/2.5
      let rangeY = 192; // 480/2.5

      // INVERSER X pour correspondre au miroir + sensibilité augmentée
      let handX = map(wrist.x, centerX - rangeX, centerX + rangeX, width, 0);
      let handY = map(wrist.y, centerY - rangeY, centerY + rangeY, 0, height);

      // Contraindre pour éviter que ça sorte de l'écran
      handX = constrain(handX, 0, width);
      handY = constrain(handY, 0, height);

      // Dessiner UN SEUL point vert pour visualiser la main
      fill(0, 255, 0);
      noStroke();
      circle(handX, handY, 25);

      // Afficher la distance et la puissance (avec fond pour visibilité)
      let distance = dist(cannonPos.x, cannonPos.y, handX, handY);
      let clampedDist = min(distance, 300);
      let power = map(clampedDist, 50, 300, 5, 20);

      // Fond semi-transparent pour les textes
      fill(0, 0, 0, 150);
      noStroke();
      rect(15, height - 235, 200, 50, 5);
      
      // Textes en blanc
      fill(255);
      textSize(18);
      textAlign(LEFT);
      text("Distance: " + Math.round(distance), 20, height - 210);
      text("Puissance: " + Math.round(power), 20, height - 185);
    }
  }
}

function shoot() {
  if (poses.length > 0) {
    let pose = poses[0];
    // Index 9 = left_wrist dans MoveNet
    let wrist = pose.keypoints[9];

    if (wrist.confidence > 0.3) {
      // Sensibilité réduite 2.5x : plage plus large pour plus de contrôle
      let centerX = 320; // Centre de 640
      let centerY = 240; // Centre de 480
      let rangeX = 256; // 640/2.5
      let rangeY = 192; // 480/2.5

      // INVERSER X pour correspondre au miroir + sensibilité augmentée
      let handX = map(wrist.x, centerX - rangeX, centerX + rangeX, width, 0);
      let handY = map(wrist.y, centerY - rangeY, centerY + rangeY, 0, height);

      // Contraindre pour éviter que ça sorte de l'écran
      handX = constrain(handX, 0, width);
      handY = constrain(handY, 0, height);

      // Calculer la distance entre le canon et la main
      let distance = dist(cannonPos.x, cannonPos.y, handX, handY);

      // Limiter la distance à 300 max
      let clampedDistance = min(distance, 300);

      // Calculer la direction du tir
      let direction = createVector(handX - cannonPos.x, handY - cannonPos.y);
      direction.normalize();

      // Tirer quand on appuie sur espace
      if (keyIsDown(32) && canShoot && squatCount > 0) {
        // Coefficient de puissance basé sur la distance (50-300 = puissance 2-15)
        let powerCoef = map(clampedDistance, 50, 300, 2, 15);
        powerCoef = constrain(powerCoef, 2, 15);
        squatCount--; // Consommer une munition

        // Créer le projectile comme sprite p5play
        let projectile = new Sprite(cannonPos.x, cannonPos.y, 15);
        projectile.mass = 2;
        projectile.color = color(255, 100, 0);
        projectile.vel.x = direction.x * powerCoef;
        projectile.vel.y = direction.y * powerCoef;
        projectile.life = 800; // Durée de vie en frames

        projectiles.push(projectile);

        canShoot = false; // Empêcher le tir en rafale
      }
    }
  }

  // Réinitialiser le tir quand on relâche la touche
  if (!keyIsDown(32)) {
    canShoot = true;
  }
}

function updateProjectiles() {
  // Mettre à jour et gérer tous les projectiles sprites
  for (let i = projectiles.length - 1; i >= 0; i--) {
    let p = projectiles[i];


    // Supprimer si hors écran ou durée de vie écoulée
    p.life--;
    if (p.y > height + 100 || p.x < -100 || p.x > width + 100 || p.life <= 0) {
      p.remove();
      projectiles.splice(i, 1);
    }

    if (ennemies.length > 0) {
      for (let j = ennemies.length - 1; j >= 0; j--) {
        let e = ennemies[j];
        // Vérifier la collision entre le projectile et l'ennemi
        if (p.collides(e)) {
          // Supprimer l'ennemi et le projectile
          e.remove();
          ennemies.splice(j, 1);
          p.remove();
          projectiles.splice(i, 1);
          break; // Sortir de la boucle ennemis
        }
      }
    }

    if(allies.length > 0) {
      for (let k = allies.length - 1; k >= 0; k--) {
        let a = allies[k];
        // Vérifier la collision entre le projectile et l'allié
        if (p.collides(a)) {
          // Supprimer l'allié et le projectile
          a.remove();
          allies.splice(k, 1);
          p.remove();
          projectiles.splice(i, 1);
          // Perdre une vie
          life--;
          break; // Sortir de la boucle alliés
        }
      }
    }
  }
}

// Callback function for when bodyPose outputs data
function gotPoses(results) {
  // Save the output to the poses variable
  poses = results;
}

// Callback function for when handPose outputs data
function gotHands(results) {
  // Save the output to the hands variable
  hands = results;
}

function updateLevel() {


  if (ennemies.length === 0 && levelStarted) {
    boisSprites.forEach(bois => bois.remove());
    boisSprites = [];
    projectiles.forEach(p => p.remove());
    projectiles = [];
    level++;
    levelStarted = false;
  }

  if (level === 1 && !levelStarted) {
    setupLevel1();
    levelStarted = true;
  }

  if (level === 2 && !levelStarted) {
    setupLevel2();
    levelStarted = true;
  }

  if (level === 3 && !levelStarted) {
    setupLevel3();
    levelStarted = true;
  }




}

