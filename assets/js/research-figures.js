(() => {
  const ink = "#292929";
  const red = "#a54843";
  const green = "#586b5c";
  const muted = "#555555";
  const line = "#b9a994";
  const ivory = "#fbf6ed";
  const rose = "#ead5cc";
  const sage = "#e0e5d9";
  const serif = 'Georgia, "Times New Roman", serif';
  const mono = 'ui-monospace, "SFMono-Regular", Consolas, monospace';
  const artWidth = 400;
  const artHeight = 200;

  function label(context, text, x, y, { size = 13, color = ink, align = "left", font = mono } = {}) {
    context.font = `${size}px ${font}`;
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = "middle";
    context.fillText(text, x, y);
  }

  function path(context, points, color = line, width = 1) {
    context.beginPath();
    context.moveTo(...points[0]);
    points.slice(1).forEach((point) => context.lineTo(...point));
    context.lineWidth = width;
    context.strokeStyle = color;
    context.stroke();
  }

  function dot(context, x, y, radius, fill, stroke = fill) {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = fill;
    context.strokeStyle = stroke;
    context.lineWidth = 1;
    context.fill();
    context.stroke();
  }

  function box(context, x, y, width, height, fill, stroke = line) {
    context.fillStyle = fill;
    context.fillRect(x, y, width, height);
    context.strokeStyle = stroke;
    context.lineWidth = 1;
    context.strokeRect(x, y, width, height);
  }

  function arrow(context, x1, x2, y, color = muted) {
    path(
      context,
      [
        [x1, y],
        [x2, y],
      ],
      color,
      1.15
    );
    path(
      context,
      [
        [x2 - 5, y - 4],
        [x2, y],
        [x2 - 5, y + 4],
      ],
      color,
      1.15
    );
  }

  function drawChorus(context) {
    const nodes = [
      { name: "Papers", color: ink, fill: ivory, y: 58 },
      { name: "Researchers", color: red, fill: rose, y: 100 },
      { name: "Concepts", color: green, fill: sage, y: 142 },
    ];

    path(
      context,
      [
        [140, 40],
        [206, 40],
        [245, 100],
        [206, 160],
        [140, 160],
      ],
      line
    );
    nodes.forEach(({ name, color, fill, y }) => {
      label(context, name, 39, y, { font: serif, size: 17 });
      path(
        context,
        [
          [141, y],
          [186, y],
          [234, 100],
        ],
        color,
        1.15
      );
      dot(context, 141, y, 6, fill, color);
    });
    dot(context, 234, 100, 8, ivory, ink);
    arrow(context, 243, 284, 100, red);
    box(context, 291, 83, 78, 34, ivory, red);
    label(context, "Ranking", 330, 100, { align: "center", font: serif, size: 17 });
    label(context, "Directed hypergraph", 187, 179, { align: "center", color: muted });
  }

  function drawCooperation(context) {
    const stages = [132, 226, 320];
    const lanes = [70, 126];
    const players = [
      { color: red, fill: rose, positions: [-10, -4] },
      { color: red, fill: rose, positions: [-4, 9] },
      { color: green, fill: sage, positions: [4, -10] },
      { color: green, fill: sage, positions: [10, 3] },
    ];

    stages.forEach((x, index) => label(context, `Round ${index + 1}`, x, 32, { align: "center", color: muted }));
    label(context, "Stable", 29, 70, { font: serif, size: 17 });
    label(context, "Regrouped", 29, 126, { font: serif, size: 17 });
    path(
      context,
      [
        [29, 98],
        [372, 98],
      ],
      line
    );

    lanes.forEach((y, lane) => {
      players.forEach(({ color, fill, positions }) => {
        const points = stages.map((x, round) => {
          const offset = lane === 1 && round === 1 ? positions[1] : positions[0];
          return [x, y + offset * 1.42];
        });
        path(context, points, color);
        points.forEach(([x, pointY]) => dot(context, x, pointY, 2.65, fill, color));
      });
    });

    label(context, "Compare grouping and enforcement", 200, 171, { align: "center", color: muted });
  }

  function drawGold(context) {
    const models = [
      { name: "ARIMA", y: 50, stroke: green, fill: sage },
      { name: "LSTM", y: 110, stroke: red, fill: rose },
    ];

    box(context, 23, 83, 100, 38, ivory);
    label(context, "Gold returns", 73, 102, { align: "center", font: serif, size: 16 });
    box(context, 281, 83, 96, 38, ivory);
    label(context, "Error on test", 329, 102, { align: "center", font: serif, size: 16 });
    path(
      context,
      [
        [123, 102],
        [142, 102],
        [142, 69],
        [162, 69],
      ],
      green
    );
    path(
      context,
      [
        [123, 102],
        [142, 102],
        [142, 129],
        [162, 129],
      ],
      red
    );

    models.forEach(({ name, y, stroke, fill }) => {
      box(context, 162, y, 76, 38, fill, stroke);
      label(context, name, 200, y + 19, { align: "center", size: 16 });
      path(
        context,
        [
          [238, y + 19],
          [260, y + 19],
          [260, 102],
        ],
        stroke
      );
    });
    arrow(context, 260, 281, 102);
    label(context, "Forecast evaluation", 200, 173, { align: "center", color: muted });
  }

  function drawInequality(context) {
    box(context, 34, 51, 79, 77, ivory);
    path(
      context,
      [
        [34, 71],
        [113, 71],
      ],
      red,
      2
    );
    [85, 97, 109].forEach((y, index) => {
      dot(context, 47, y, 2.5, index % 2 ? green : red);
      path(
        context,
        [
          [56, y],
          [95, y],
        ],
        line
      );
    });

    arrow(context, 120, 160, 89);
    box(context, 168, 63, 65, 52, sage, green);
    label(context, "OLS", 200, 89, { align: "center", size: 19 });
    arrow(context, 241, 279, 89);

    box(context, 287, 51, 79, 77, ivory);
    [76, 89, 102].forEach((y) => {
      path(
        context,
        [
          [302, y],
          [307, y + 4],
          [313, y - 3],
        ],
        green,
        1.5
      );
      path(
        context,
        [
          [321, y],
          [351, y],
        ],
        line
      );
    });

    label(context, "UK Census", 73, 146, { align: "center", font: serif, size: 17 });
    label(context, "Pay model", 200, 146, { align: "center", font: serif, size: 17 });
    label(context, "Diagnostics", 326, 146, { align: "center", font: serif, size: 17 });
  }

  function drawLlm(context) {
    label(context, "Compound", 29, 42, { color: muted });
    label(context, "Head alone", 29, 113, { color: muted });
    box(context, 29, 56, 77, 35, rose, red);
    box(context, 106, 56, 77, 35, sage, green);
    box(context, 106, 127, 77, 35, sage, green);
    label(context, "washing", 67.5, 73.5, { align: "center", font: serif, size: 17 });
    label(context, "machine", 144.5, 73.5, { align: "center", font: serif, size: 17 });
    label(context, "machine", 144.5, 144.5, { align: "center", font: serif, size: 17 });

    path(
      context,
      [
        [183, 74],
        [213, 74],
        [213, 109],
      ],
      red
    );
    path(
      context,
      [
        [183, 145],
        [213, 145],
        [213, 109],
      ],
      green
    );
    arrow(context, 213, 238, 109);

    box(context, 245, 68, 126, 83, ivory);
    path(
      context,
      [
        [245, 109],
        [371, 109],
      ],
      line
    );
    label(context, "Cosine similarity", 308, 89, { align: "center", font: serif, size: 16 });
    label(context, "Sparse features", 308, 130, { align: "center", font: serif, size: 16 });
  }

  function drawTwins(context) {
    const team = [
      [200, 40],
      [248, 75],
      [230, 132],
      [170, 132],
      [152, 75],
    ];

    dot(context, 200, 91, 51, ivory, line);
    team.forEach(([x, y], index) => {
      const color = index % 2 ? red : green;
      dot(context, x, y, 6, index % 2 ? rose : sage, color);
    });
    label(context, "Public", 200, 82, { align: "center", font: serif, size: 17 });
    label(context, "transcript", 200, 101, { align: "center", font: serif, size: 17 });

    label(context, "Twin", 66, 82, { align: "center", font: serif, size: 17 });
    label(context, "profiles", 66, 101, { align: "center", font: serif, size: 17 });
    arrow(context, 103, 139, 91, red);
    arrow(context, 261, 296, 91, green);
    label(context, "Group", 335, 82, { align: "center", font: serif, size: 17 });
    label(context, "choice", 335, 101, { align: "center", font: serif, size: 17 });
    label(context, "Matched randomization", 200, 168, { align: "center", color: muted });
  }

  const drawings = {
    chorus: drawChorus,
    cooperation: drawCooperation,
    gold: drawGold,
    inequality: drawInequality,
    llm: drawLlm,
    twins: drawTwins,
  };

  function prepareFigure(canvas) {
    const name = canvas.dataset.researchFigure;
    if (!Object.hasOwn(drawings, name)) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let renderedWidth = 0;
    let renderedHeight = 0;

    function render() {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;

      const density = Math.min(window.devicePixelRatio || 1, 3);
      const pixelWidth = Math.round(width * density);
      const pixelHeight = Math.round(height * density);
      if (pixelWidth === renderedWidth && pixelHeight === renderedHeight) return;

      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      renderedWidth = pixelWidth;
      renderedHeight = pixelHeight;
      const scale = Math.min(pixelWidth / artWidth, pixelHeight / artHeight);
      const offsetX = (pixelWidth - artWidth * scale) / 2;
      const offsetY = (pixelHeight - artHeight * scale) / 2;
      context.setTransform(scale, 0, 0, scale, offsetX, offsetY);
      drawings[name](context);
    }

    canvas.setAttribute("data-figure-ready", "");
    render();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(render);
      observer.observe(canvas);
    } else {
      window.addEventListener("resize", render, { passive: true });
    }
  }

  document.querySelectorAll("canvas[data-research-figure]").forEach(prepareFigure);
})();
