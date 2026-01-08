/*
 * 👋 Hello! This is an ml5.js example made and shared with ❤️.
 * Learn more about the ml5.js project: https://ml5js.org/
 * ml5.js license and Code of Conduct: https://github.com/ml5js/ml5-next-gen/blob/main/LICENSE.md
 *
 * This example demonstrates drawing skeletons on poses for the MoveNet model.
 */

let video;
let bodyPose;
let poses = [];
let connections;
let previousPose = null;
let squatInProgress = false;
let squatCount = 15000;
let minHipY = 999999; // Pour suivre la position la plus basse
let maxHipY = 0; // Pour suivre la position la plus haute
let squatStartTime = 0; // Pour tracker le temps de la descente

// Variables pour le tir
let cannonPos; // Point A - Position fixe du canon
let projectiles = []; // Liste des projectiles tirés
let canShoot = true; // Pour éviter le tir en rafale
let floorSprite; // Sprite pour le sol
let boisSprite1; // Sprite bois à 90°
let boisSprite2; // Sprite bois à 0°
let boisImg; // Image SVG du bois

// Variables pour la détection de main
let handPose;
let hands = [];
let modelsLoaded = false;

function preload() {
  // Load the bodyPose model
  bodyPose = ml5.bodyPose();
  // Load the handPose model (sans options de dessin automatique)
  handPose = ml5.handPose({ flipped: false });
  // Charger l'image SVG du bois
  boisImg = loadImage('../assets/bois.svg');
  // Ciel. Tu m'avais pas dit qu'elle puait la merde.
  bgImg = loadImage('../assets/background.svg');
  // Sol ///////////////////////////////////////////////////////////////////////////////////////////////
  floorImg = loadImage('../assets/1er-plan.svg');

}

function setup() {
  // Créer le canvas en plein écran
  createCanvas(windowWidth, windowHeight);
  
  // Create the video and hide it
  video = createCapture(VIDEO);
  video.size(640, 480); // Taille pour la capture (ml5 détectera sur cette résolution)
  video.hide();


    // Créer le sprite du sol

  /////////////////////////////////////////////////////////////////////////////////////////////////////////
// Sprite visuel (le SVG)
let floorSprite = new Sprite(width/2, height/2 + 275, 0, 0, 'static');
floorSprite.img = floorImg;
floorSprite.collider = "none"; // pas de hitbox sur l'image

// Hitbox 1
let hit1 = new Sprite(width/2 - 700, height/2 + 250, 500, 300, 'static');
hit1.debug = true;
hit1.debugColor = "green";

// Hitbox 2
let hit2 = new Sprite(width/2, height/2 + 500, 2500, 300, 'static');
hit2.debug = true;
hit2.debugColor = "green";
  


  // Start detecting poses in the webcam video
  bodyPose.detectStart(video, gotPoses);
  // Start detecting hands from the webcam video
  handPose.detectStart(video, gotHands);
  // Get the skeleton connection information
  connections = bodyPose.getSkeleton();
  
  // Initialiser la position du canon (centre gauche de l'écran)
  cannonPos = createVector(150, height - 250);
  


  
  // Créer les sprites de bois avec le SVG
  boisSprite1 = new Sprite(width/2 - 200, height - 300, 100, 100);
  boisSprite1.img = boisImg;
  boisSprite1.rotation = 90; // Rotation à 90°
  
  boisSprite2 = new Sprite(width/2 + 200, height - 300, 100, 100 );
  boisSprite2.img = boisImg;
  boisSprite2.rotation = 0; // Rotation à 0°
  
  console.log("✅ Setup terminé - Modèles en cours de chargement...");
  modelsLoaded = true;
  world.gravity.y = 10;
}


function windowResized() {
  // Adapter le canvas à la nouvelle taille de la fenêtre
  resizeCanvas(windowWidth, windowHeight);
  // Mettre à jour la position du canon
  cannonPos = createVector(150, height - 150);
  // Mettre à jour le sprite du sol
  if(floorSprite){
    floorSprite.x = width/2;
    floorSprite.y = height - 100;
    floorSprite.width = width;
  }
}

function draw() {
  // Dessiner l'environnement de jeu
  drawGameEnvironment();
  
  // Message de chargement si les modèles ne sont pas prêts
  if(!modelsLoaded){
    fill(255);
    textSize(32);
    textAlign(CENTER);
    text("Chargement des modèles...", width/2, height/2);
    return;
  }
  
  // Mettre à jour les projectiles (p5play les dessine automatiquement)
  updateProjectiles();
  
  // Gérer la détection
  if(poses.length > 0){
    squatDetected();
  }
  
  // Dessiner le canon APRES les sprites pour qu'il soit visible
  drawCannon();
  
  // Gérer le tir
  shoot();
  
  // Dessiner la miniature caméra en haut à droite (DERNIER pour être au dessus)
  drawCameraMiniature();
}

function drawGameEnvironment(){
  // Arrière-plan (ciel)
  image(bgImg, 0, 0, bgImg.width, bgImg.height);
  
  // Le sol est maintenant un sprite p5play
  // Ligne d'herbe sur le sol
  fill(34, 139, 34);
  noStroke();
  rect(0, height - 200, width, 20);
  
  // Afficher les infos de jeu
  fill(255);
  textSize(24);
  textAlign(LEFT);
  text("Munitions: " + squatCount, 20, 40);
}

function drawCameraMiniature(){
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
  if(hands.length > 0){
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

function squatDetected(){
    if(poses.length > 0){
        let pose = poses[0];
        let leftKnee = pose.keypoints[13];
        let rightKnee = pose.keypoints[14];
        let leftHip = pose.keypoints[11];
        let rightHip = pose.keypoints[12];
        let leftAnkle = pose.keypoints[15];
        let rightAnkle = pose.keypoints[16];
        
        if(leftKnee.confidence > 0.2 && rightKnee.confidence > 0.2 &&
           leftHip.confidence > 0.2 && rightHip.confidence > 0.2 &&
           leftAnkle.confidence > 0.2 && rightAnkle.confidence > 0.2){
            
            // Position moyenne des hanches (plus Y est grand, plus on est bas)
            let avgHipY = (leftHip.y + rightHip.y) / 2;
            
            // Mise à jour des extremums avec lissage
            if(!squatInProgress){
                // Quand on est debout, on met à jour la position haute
                if(avgHipY < maxHipY || maxHipY === 0){
                    maxHipY = avgHipY;
                }
            }
            
            // Vérifier si on a une pose précédente
            if(previousPose){
                let prevLeftHip = previousPose.keypoints[11];
                let prevRightHip = previousPose.keypoints[12];
                let prevAvgHipY = (prevLeftHip.y + prevRightHip.y) / 2;
                
                // Calculer le mouvement vertical des hanches
                let hipMovement = avgHipY - prevAvgHipY;
                
                text("Hip Movement: " + Math.round(hipMovement), 10, height - 100);
                
                // Descente: les hanches descendent (Y augmente)
                // On détecte quand les hanches descendent significativement
                if(hipMovement > 3 && !squatInProgress){
                    // Commencer à détecter la descente
                    if(avgHipY > maxHipY + 35){ // Descente d'au moins 35 pixels
                        squatInProgress = true;
                        minHipY = avgHipY;
                        squatStartTime = millis(); // Enregistrer le temps de début
                        console.log("🔽 DESCENTE détectée! Hip Y: " + Math.round(avgHipY));
                        fill(0, 255, 0);
                        text("🔽 DESCENTE", width/2 - 50, height/2);
                    }
                }
                // Montée: les hanches remontent (Y diminue)
                else if(hipMovement < -3 && squatInProgress){
                    // Vérifier qu'on remonte après être descendu
                    if(avgHipY < minHipY - 20){ // Remontée d'au moins 20 pixels
                        squatCount++;
                        squatInProgress = false;
                        maxHipY = avgHipY; // Réinitialiser la position haute
                        
                    }
                }
                
                // Timeout: si en descente depuis plus de 2 secondes, annuler
                if(squatInProgress && millis() - squatStartTime > 2000){
                    console.log("⚠️ Timeout squat - Réinitialisation");
                    squatInProgress = false;
                    maxHipY = avgHipY;
                }
                
                // Afficher l'état
                if(squatInProgress){
                    fill(255, 150, 0);
                    textSize(16);
                    text("🔽 EN DESCENTE", 10, 30);
                    
                }
            }
        }
        previousPose = pose;
    }
}

function drawCannon(){
  // Dessiner le canon (point A) en jaune
  fill(255, 255, 0);
  noStroke();
  circle(cannonPos.x, cannonPos.y, 30);
  
  // Ligne de visée vers le poignet GAUCHE détecté (depuis bodyPose)
  if(poses.length > 0){
    let pose = poses[0];
    // Index 9 = left_wrist dans MoveNet
    let wrist = pose.keypoints[9];
    
    // Debug: afficher la confidence
    fill(255);
    textSize(14);
    text("Wrist confidence: " + wrist.confidence.toFixed(2), 20, height - 170);
    
    if(wrist.confidence > 0.3){
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
    
    // // Ligne élastique style Angry Birds du canon vers la main
    // stroke(139, 69, 19); // Marron pour l'élastique
    // strokeWeight(4);
    // line(cannonPos.x, cannonPos.y, handX, handY);
    
    // // Ligne de retour (pour effet élastique)
    // line(cannonPos.x, cannonPos.y + 40, handX, handY);
    
    // Afficher la distance et la puissance
    let distance = dist(cannonPos.x, cannonPos.y, handX, handY);
    let clampedDist = min(distance, 300);
    let power = map(clampedDist, 50, 300, 5, 20);
    
    fill(255);
    noStroke();
    textSize(18);
    textAlign(LEFT);
    text("Distance: " + Math.round(distance), 20, height - 220);
    text("Puissance: " + Math.round(power), 20, height - 195);
    }
  }
}

function shoot(){
  if(poses.length > 0){
    let pose = poses[0];
    // Index 9 = left_wrist dans MoveNet
    let wrist = pose.keypoints[9];
    
    if(wrist.confidence > 0.3){
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
    if(keyIsDown(32) && canShoot && squatCount > 0){ 
      // Coefficient de puissance basé sur la distance (50-300 = puissance 2-15)
      let powerCoef = map(clampedDistance, 50, 300, 2, 15);
      powerCoef = constrain(powerCoef, 2, 15);
      squatCount--; // Consommer une munition
      
      // Créer le projectile comme sprite p5play
      let projectile = new Sprite(cannonPos.x, cannonPos.y, 15);
      projectile.color = color(255, 100, 0);
      projectile.vel.x = direction.x * powerCoef;
      projectile.vel.y = direction.y * powerCoef;
      projectile.life = 300; // Durée de vie en frames
      
      projectiles.push(projectile);
      console.log("🔫 TIR! Puissance: " + Math.round(powerCoef) + " | Distance: " + Math.round(distance));
      
      canShoot = false; // Empêcher le tir en rafale
    }
    }
  }
  
  // Réinitialiser le tir quand on relâche la touche
  if(!keyIsDown(32)){
    canShoot = true;
  }
}

function updateProjectiles(){
  // Mettre à jour et gérer tous les projectiles sprites
  for(let i = projectiles.length - 1; i >= 0; i--){
    let p = projectiles[i];
    
    
    
    // // Supprimer si hors écran ou durée de vie écoulée
    // if(p.y > height || p.x < 0 || p.x > width || p.life <= 0){
    //   p.remove(); // Retirer le sprite
    //   projectiles.splice(i, 1);
    // }
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





