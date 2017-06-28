/**
 *
 * @licstart
 *
 * Copyright (C) 2017 Marcio L Teixeira.
 *
 *
 * The JavaScript code in this page is free software: you can
 * redistribute it and/or modify it under the terms of the GNU Affero
 * General Public License (GNU AGPL) as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option)
 * any later version.  The code is distributed WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU AGPL for more details.
 *
 * As additional permission under GNU AGPL version 3 section 7, you
 * may distribute non-source (e.g., minimized or compacted) forms of
 * that code without the copy of the GNU AGPL normally required by
 * section 4, provided you include this license notice and a URL
 * through which recipients can access the Corresponding Source.
 *
 * @licend
 *
 */
 
function DataCollection() {
    
    var vrDisplay = null;
    function setupVR(callback) {
        if(!navigator.getVRDisplays) {
            alert("WebVR is not supported");
            return;
        }

        try {
            // Get the VRDisplay and save it for later.
            navigator.getVRDisplays().then(
                function(displays) {
                    for(var i = 0; i < displays.length; i++) {
                        if(displays[i].capabilities.hasOrientation) {
                            vrDisplay = displays[i];
                            callback()
                            return;
                        }
                    }
                    alert("WebVR is supported, but no VR displays found");
                }
            );
        } catch(e) {
            alert("Query of VRDisplays failed" + e.toString());
        }
    }

    var statusElement = document.getElementById("status");
    var frameData = new VRFrameData();
    //var headsetAcceleration  = new THREE.Vector3();
    function update() {
        vrDisplay.getFrameData(frameData);
        if (frameData.pose && frameData.pose.linearAcceleration) {
            onAccelerometerData(
                frameData.timestamp,
                frameData.pose.linearAcceleration[0],
                frameData.pose.linearAcceleration[1],
                frameData.pose.linearAcceleration[2]
            );
            //headsetAcceleration.fromArray(pose.linearAcceleration);
            //this.stepDetector.detectFromVector(headsetAcceleration);
            vrDisplay.requestAnimationFrame(update);
        }
    }
    
    function registerAccelerometerEvents() {
        var clock = new THREE.Clock();
        
        function format(value) {
            return Number(value.toFixed(5));
        }
        function motion(event) {
            onAccelerometerData(
                format(clock.getElapsedTime()),
                format(event.accelerationIncludingGravity.x),
                format(event.accelerationIncludingGravity.y),
                format(event.accelerationIncludingGravity.z)
            );
            if(data.length % 100 == 0) {
                statusElement.innerText = data.length/100;
            }
        }

        if(window.DeviceMotionEvent){
            window.addEventListener("devicemotion", motion, false);
        } else {
            alert("DeviceMotionEvent is not supported");
        }
    }
    
    var data = [];
    function onAccelerometerData(timestamp, x, y, z) {
        data.push([timestamp, x, y, z]);
    }
    
    this.sendData = function() {
            alert("sending data");
         var link = "mailto:marciot@yahoo.com?subject=data&body=" + encodeURI(JSON.stringify(data));
         window.location.href = link;
    }
    
    setupVR(function() {
        vrDisplay.requestAnimationFrame(update);
        registerAccelerometerEvents();
    });
}

class StepDetector {
    constructor() {
        // Moving average
        const mavWindowSize = 21;
        this.mavWindow      = new Float32Array(mavWindowSize);
        this.mavIndex       = 0;
        this.mavSum         = 0;

        this.eventListeners = {
            tap:       [],
            doubletap: []
        };

        this.tapClock = new THREE.Clock(false);
    }

    dispose() {
        this.eventListeners.length = 0;
    }

    addEventListener(eventStr, callback) {
        this.eventListeners[eventStr].push(callback);
    }

    dispatchEvent(eventStr, ...args) {
        for(var i = 0; i < this.eventListeners[eventStr].length; i++) {
            this.eventListeners[eventStr][i].apply(null, args);
        }
    }

    addValueToMovingAverage(value) {
        this.mavSum -= this.mavWindow[this.mavIndex];
        this.mavWindow[this.mavIndex] = value;
        this.mavIndex = (this.mavIndex + 1) % this.mavWindow.length;
        this.mavSum += value;
    }

    get movingAverage() {
        return this.mavSum/this.mavWindow.length;
    }

    detectFromVector(v) {
        const magnitude = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
        return this.detectFromScalar(magnitude);
    }

    detectFromScalar(value) {
        const tapThreshold  = 4;
        const tapDetected = value > this.movingAverage * tapThreshold;
        this.timerAction(tapDetected);
        this.addValueToMovingAverage(value);
    }

    timerAction(tapDetected) {
        const minDoubleTapTime = 0.15;
        const doubleTapTime    = 0.50;

        if(tapDetected) {
            if(!this.tapClock.running) {
                // Click event will be dispatched when timer runs down.
                this.tapClock.start();
            } else if(this.tapClock.getElapsedTime() > minDoubleTapTime) {
                this.tapClock.stop();
                this.dispatchEvent("doubletap");
            }
        } else {
            if(this.tapClock.running && this.tapClock.getElapsedTime() > doubleTapTime) {
                this.tapClock.stop();
                this.dispatchEvent("tap");
            }
        }
    }
}