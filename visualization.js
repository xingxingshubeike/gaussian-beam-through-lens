document.addEventListener("DOMContentLoaded", () => {
  // Get references to DOM elements
  const inputs = {
    lambda: document.getElementById("lambda"),
    f: document.getElementById("focalLength"),
    s: document.getElementById("s"),
    w0: document.getElementById("w0"),
  };

  const outputs = {
    s_prime: document.getElementById("s-prime-out"),
    w0_prime: document.getElementById("w0-prime-out"),
    zr_in: document.getElementById("zr-in-out"),
    zr_prime: document.getElementById("zr-prime-out"),
    theta_in: document.getElementById("theta-in-out"),
    theta_prime: document.getElementById("theta-prime-out"),
  };

  const canvas = document.getElementById("beamCanvas");
  const ctx = canvas.getContext("2d");

  // Main function to update calculations and redraw canvas
  function updateVisualization() {
    // --- 1. Get User Inputs and Convert to SI units (meters) ---
    // Wavelength is input in nm, convert to m
    const lambda = parseFloat(inputs.lambda.value) * 1e-9;
    // Other inputs are in mm, convert to m
    const f = parseFloat(inputs.f.value) * 1e-3;
    // Object distance 's' is conventionally negative
    const s = -parseFloat(inputs.s.value) * 1e-3;
    const w0 = parseFloat(inputs.w0.value) * 1e-3;

    if ([lambda, f, s, w0].some(isNaN)) return;
    if (w0 <= 0 || lambda <= 0 || f <= 0) return;

    // --- 2. Perform Calculations based on provided document formulas ---

    // Input Rayleigh Range (z_R)
    const zr = (Math.PI * w0 ** 2) / lambda;

    // Output Beam Waist (w_0')
    // Note: The formula uses |s|, which is -s with our sign convention.
    // So (|s| - f)^2 becomes (-s - f)^2 which is (s + f)^2.
    const w0_prime = (w0 * f) / Math.sqrt((s + f) ** 2 + zr ** 2);

    // Magnification (alpha)
    const alpha = w0_prime / w0;

    // Output Waist Position (s')
    const s_prime = f + alpha ** 2 * (-s - f);

    // Input and Output Divergence Angles (theta, theta')
    const theta_in = lambda / (Math.PI * w0);
    const theta_prime = theta_in / alpha;

    // Output Rayleigh Range (z_R')
    const zr_prime = alpha ** 2 * zr;

    // --- 3. Update the Output Display (converting back to mm/mrad) ---
    outputs.s_prime.textContent = (s_prime * 1000).toFixed(2);
    outputs.w0_prime.textContent = (w0_prime * 1000).toFixed(3);
    outputs.zr_in.textContent = (zr * 1000).toFixed(2);
    outputs.zr_prime.textContent = (zr_prime * 1000).toFixed(2);
    outputs.theta_in.textContent = (theta_in * 1000).toFixed(3);
    outputs.theta_prime.textContent = (theta_prime * 1000).toFixed(3);

    // --- 4. Draw Everything on the Canvas ---
    drawCanvas({
      lambda,
      f,
      s,
      w0,
      zr,
      theta_in,
      s_prime,
      w0_prime,
      zr_prime,
      theta_prime,
    });
  }

  function drawCanvas(params) {
    const { f, s, w0, zr, theta_in, s_prime, w0_prime, zr_prime, theta_prime } =
      params;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- Setup Coordinate System ---
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const opticalAxisY = canvasHeight / 2;

    // Determine the drawing scale to fit everything
    const totalDist =
      Math.max(-s, s_prime, f, Math.abs(s + f), Math.abs(s_prime - f)) * 2.2;
    const scaleX = canvasWidth / totalDist;

    // Calculate beam width at the edges of the drawing area for Y scaling
    const beamWidthAtStart =
      w0 * Math.sqrt(1 + ((-totalDist / 2 - s) / zr) ** 2);
    const beamWidthAtEnd =
      w0_prime * Math.sqrt(1 + ((totalDist / 2 - s_prime) / zr_prime) ** 2);
    const maxHeight = Math.max(beamWidthAtStart, beamWidthAtEnd);
    const scaleY = canvasHeight / (maxHeight * 2.5);

    const lensX = canvasWidth / 2;

    // --- Draw Optical Axis ---
    ctx.beginPath();
    ctx.moveTo(0, opticalAxisY);
    ctx.lineTo(canvasWidth, opticalAxisY);
    ctx.strokeStyle = "black";
    ctx.stroke();

    // --- Draw Lens ---
    const lensHeight = Math.min(maxHeight * scaleY * 1.5, canvasHeight / 2.2);
    ctx.beginPath();
    ctx.moveTo(lensX, opticalAxisY - lensHeight);
    ctx.lineTo(lensX, opticalAxisY + lensHeight);
    ctx.strokeStyle = "#4A90E2";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Lens arrows
    ctx.moveTo(lensX, opticalAxisY - lensHeight);
    ctx.lineTo(lensX + 5, opticalAxisY - lensHeight + 10);
    ctx.moveTo(lensX, opticalAxisY - lensHeight);
    ctx.lineTo(lensX - 5, opticalAxisY - lensHeight + 10);
    ctx.moveTo(lensX, opticalAxisY + lensHeight);
    ctx.lineTo(lensX + 5, opticalAxisY + lensHeight - 10);
    ctx.moveTo(lensX, opticalAxisY + lensHeight);
    ctx.lineTo(lensX - 5, opticalAxisY + lensHeight - 10);
    ctx.stroke();
    ctx.lineWidth = 1;

    // Function to draw a Gaussian beam envelope
    function drawBeam(waistPos, waistRadius, rayleighRange, startZ, endZ) {
      ctx.beginPath();
      // Draw top envelope
      for (let z = startZ; z <= endZ; z += 1 / scaleX) {
        const x_canvas = lensX + z * scaleX;
        const w_z =
          waistRadius * Math.sqrt(1 + ((z - waistPos) / rayleighRange) ** 2);
        const y_canvas = opticalAxisY - w_z * scaleY;
        if (z === startZ) {
          ctx.moveTo(x_canvas, y_canvas);
        } else {
          ctx.lineTo(x_canvas, y_canvas);
        }
      }
      // Draw bottom envelope
      for (let z = endZ; z >= startZ; z -= 1 / scaleX) {
        const x_canvas = lensX + z * scaleX;
        const w_z =
          waistRadius * Math.sqrt(1 + ((z - waistPos) / rayleighRange) ** 2);
        const y_canvas = opticalAxisY + w_z * scaleY;
        ctx.lineTo(x_canvas, y_canvas);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(255, 100, 100, 0.3)";
      ctx.fill();
    }

    // Draw input and output beams
    drawBeam(s, w0, zr, -totalDist / 2, 0); // Input beam
    drawBeam(s_prime, w0_prime, zr_prime, 0, totalDist / 2); // Output beam

    // --- Annotations ---
    ctx.font = "12px Arial";
    ctx.fillStyle = "black";
    ctx.textAlign = "center";

    // Helper for annotation lines
    function drawAnnotationLine(x1, y1, x2, y2, label) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = "#333";
      ctx.stroke();

      // Add ticks at the end of the line
      ctx.moveTo(x1, y1 - 5);
      ctx.lineTo(x1, y1 + 5);
      ctx.moveTo(x2, y2 - 5);
      ctx.lineTo(x2, y2 + 5);
      ctx.strokeStyle = "#555";
      ctx.stroke();

      ctx.fillText(label, (x1 + x2) / 2, y1 - 8);
    }

    // Annotate s and s'
    drawAnnotationLine(
      lensX + s * scaleX,
      opticalAxisY + 40,
      lensX,
      opticalAxisY + 40,
      `s = ${(-s * 1000).toFixed(1)} mm`
    );
    drawAnnotationLine(
      lensX,
      opticalAxisY + 60,
      lensX + s_prime * scaleX,
      opticalAxisY + 60,
      `s' = ${(s_prime * 1000).toFixed(1)} mm`
    );

    // --- NEW: Annotate Focal Lengths on both sides ---
    const f_y_offset = opticalAxisY - 50; // Y position for focal length annotations
    // Annotate negative focal point F'
    drawAnnotationLine(
      lensX - f * scaleX,
      f_y_offset,
      lensX,
      f_y_offset,
      `f = ${(f * 1000).toFixed(1)} mm`
    );
    // Annotate positive focal point F
    drawAnnotationLine(
      lensX,
      f_y_offset - 20,
      lensX + f * scaleX,
      f_y_offset - 20,
      `f = ${(f * 1000).toFixed(1)} mm`
    );

    // Annotate w0 and w0' with values
    const w0_x = lensX + s * scaleX;
    const w0_y = opticalAxisY;
    ctx.beginPath();
    ctx.moveTo(w0_x, w0_y - w0 * scaleY);
    ctx.lineTo(w0_x, w0_y + w0 * scaleY);
    ctx.strokeStyle = "red";
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillText(`w₀ = ${(w0 * 1000).toFixed(3)} mm`, w0_x + 8, w0_y - 5);

    const w0_prime_x = lensX + s_prime * scaleX;
    const w0_prime_y = opticalAxisY;
    ctx.beginPath();
    ctx.moveTo(w0_prime_x, w0_prime_y - w0_prime * scaleY);
    ctx.lineTo(w0_prime_x, w0_prime_y + w0_prime * scaleY);
    ctx.strokeStyle = "blue";
    ctx.stroke();
    ctx.fillText(
      `w₀' = ${(w0_prime * 1000).toFixed(3)} mm`,
      w0_prime_x + 8,
      w0_prime_y - 5
    );

    // Annotate Rayleigh Ranges and Divergence Angles in blank space
    ctx.textAlign = "center";
    const textY = 30; // Y position for the top annotations

    // Input beam annotations
    ctx.fillText(`zʀ = ${(zr * 1000).toFixed(2)} mm`, lensX / 2, textY);
    ctx.fillText(
      `θ = ${(theta_in * 1000).toFixed(3)} mrad`,
      lensX / 2,
      textY + 18
    );

    // Output beam annotations
    ctx.fillText(
      `zʀ' = ${(zr_prime * 1000).toFixed(2)} mm`,
      lensX + lensX / 2,
      textY
    );
    ctx.fillText(
      `θ' = ${(theta_prime * 1000).toFixed(3)} mrad`,
      lensX + lensX / 2,
      textY + 18
    );
  }

  // Add event listeners to all input fields
  for (const key in inputs) {
    inputs[key].addEventListener("input", updateVisualization);
  }

  // Initial call to draw the default setup
  updateVisualization();
});
