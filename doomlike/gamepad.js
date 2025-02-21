/***** gamepad.js *****/
(function() {
    let previousButtonsState = [];
    const axisThreshold = 0.5;

    function pollGamepad() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = gamepads[0];

        if (gp) {
            // --- Mapeo del stick izquierdo para movimiento y rotación ---
            // Eje 1: -1 = hacia arriba (w), 1 = hacia abajo (s)
            if (gp.axes[1] < -axisThreshold) {
                window.keys["w"] = true;
            } else {
                window.keys["w"] = false;
            }
            if (gp.axes[1] > axisThreshold) {
                window.keys["s"] = true;
            } else {
                window.keys["s"] = false;
            }

            // Eje 0: -1 = izquierda (ArrowLeft), 1 = derecha (ArrowRight)
            if (gp.axes[0] < -axisThreshold) {
                window.keys["ArrowLeft"] = true;
            } else {
                window.keys["ArrowLeft"] = false;
            }
            if (gp.axes[0] > axisThreshold) {
                window.keys["ArrowRight"] = true;
            } else {
                window.keys["ArrowRight"] = false;
            }

            // --- Botones para disparar ---
            // Botón A (índice 0)
            const shootA = gp.buttons[0].pressed;
            if (shootA && !previousButtonsState[0]) {
                if (typeof window.shootBullet === "function") {
                    window.shootBullet();
                }
            }
            previousButtonsState[0] = shootA;

            // Botón RT (índice 7)
            const shootRT = gp.buttons[7].pressed;
            if (shootRT && !previousButtonsState[7]) {
                if (typeof window.shootBullet === "function") {
                    window.shootBullet();
                }
            }
            previousButtonsState[7] = shootRT;

            // --- Dash con botón Y (índice 3) ---
            const dashButton = gp.buttons[3].pressed;
            if (dashButton && !previousButtonsState[3]) {
                if (typeof window.dash === "function") {
                    window.dash();
                }
            }
            previousButtonsState[3] = dashButton;

            // --- Movimiento lateral (strafe) ---
            // LB para strafe izquierda (índice 4) mapeado a "q"
            if (gp.buttons[4].pressed) {
                window.keys["q"] = true;
            } else {
                window.keys["q"] = false;
            }
            // RB para strafe derecha (índice 5) mapeado a "e"
            if (gp.buttons[5].pressed) {
                window.keys["e"] = true;
            } else {
                window.keys["e"] = false;
            }
        }

        requestAnimationFrame(pollGamepad);
    }

    // Iniciar el polling al conectar un gamepad
    window.addEventListener("gamepadconnected", function(e) {
        console.log("Gamepad conectado en el índice %d: %s. %d botones, %d ejes.",
            e.gamepad.index, e.gamepad.id,
            e.gamepad.buttons.length, e.gamepad.axes.length);
        pollGamepad();
    });

    // Si el gamepad ya está conectado al cargar la página, iniciar el polling
    window.addEventListener("load", function() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        if (gamepads[0]) {
            pollGamepad();
        }
    });
})();
