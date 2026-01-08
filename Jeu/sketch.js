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
let squatCount = 0;
let minHipY = 999999; // Pour suivre la position la plus basse
let maxHipY = 0; // Pour suivre la position la plus haute

function preload() {
  // Load the bodyPose model
  bodyPose = ml5.bodyPose();
}

function setup() {
  createCanvas(640, 480);

  // Create the video and hide it
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  // Start detecting poses in the webcam video
  bodyPose.detectStart(video, gotPoses);
  // Get the skeleton connection information
  connections = bodyPose.getSkeleton();
}

function draw() {
  // Draw the webcam video
  image(video, 0, 0, width, height);

  // Draw the skeleton connections
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    for (let j = 0; j < connections.length; j++) {
      let pointAIndex = connections[j][0];
      let pointBIndex = connections[j][1];
      let pointA = pose.keypoints[pointAIndex];
      let pointB = pose.keypoints[pointBIndex];
      // Only draw a line if both points are confident enough
      if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
        stroke(255, 0, 0);
        strokeWeight(2);
        line(pointA.x, pointA.y, pointB.x, pointB.y);
      }
    }
  }

  // Draw all the tracked landmark points
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    for (let j = 0; j < pose.keypoints.length; j++) {
      let keypoint = pose.keypoints[j];
      // Only draw a circle if the keypoint's confidence is bigger than 0.1
      if (keypoint.confidence > 0.1) {
        if(j === 14 || j === 13){ // wrists
            fill(0, 0, 255);
        } else {
            fill(255, 0, 0);
        }
        noStroke();
        circle(keypoint.x, keypoint.y, 10);
      }
    }
    squatDetected();
  }
  
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
            
            // Debug - afficher toutes les valeurs
            fill(255, 255, 0);
            textSize(12);
            noStroke();
            
            text("Squat Count: " + squatCount, 10, height - 20);
            
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
                    if(avgHipY > maxHipY + 50){ // Descente d'au moins 50 pixels
                        squatInProgress = true;
                        minHipY = avgHipY;
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
  




// Callback function for when bodyPose outputs data
function gotPoses(results) {
  // Save the output to the poses variable
  poses = results;
}





