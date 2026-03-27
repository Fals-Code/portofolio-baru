document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    const scoreEl = document.getElementById("score");
    const resetBtn = document.getElementById("resetBtn");

    const gridSize = 20;
    const tileCount = canvas.width / gridSize;

    let score = 0;
    let dx = 0;
    let dy = 0;
    let snake = [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 }
    ];
    let food = { x: 5, y: 5, type: 'laravel' };
    let gameLoop;
    let speed = 100;

    function draw() {
        // Move snake
        const head = { x: snake[0].x + dx, y: snake[0].y + dy };
        
        // Game Over Check
        if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount || collision(head)) {
            gameOver();
            return;
        }

        snake.unshift(head);

        // Check Food
        if (head.x === food.x && head.y === food.y) {
            score += 10;
            scoreEl.innerText = score;
            spawnFood();
            if (speed > 50) speed -= 2; // Increase speed
            clearInterval(gameLoop);
            gameLoop = setInterval(draw, speed);
        } else {
            snake.pop();
        }

        // Clear Canvas
        ctx.fillStyle = "#0d1117";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Food
        ctx.fillStyle = food.type === 'laravel' ? "#e8533a" : "#8892be";
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        ctx.beginPath();
        ctx.arc(food.x * gridSize + gridSize/2, food.y * gridSize + gridSize/2, gridSize/2 - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw Snake
        snake.forEach((part, index) => {
            ctx.fillStyle = index === 0 ? "#23c55e" : "#1a9d4a";
            ctx.fillRect(part.x * gridSize + 1, part.y * gridSize + 1, gridSize - 2, gridSize - 2);
        });
    }

    function collision(head) {
        return snake.some((part, index) => index !== 0 && part.x === head.x && part.y === head.y);
    }

    function spawnFood() {
        food = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount),
            type: Math.random() > 0.5 ? 'laravel' : 'php'
        };
        // Don't spawn on snake
        if (snake.some(part => part.x === food.x && part.y === food.y)) spawnFood();
    }

    function gameOver() {
        clearInterval(gameLoop);
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 30px Syne";
        ctx.textAlign = "center";
        ctx.fillText("SYSTEM CRASH!", canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = "20px Syne";
        ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
        ctx.font = "14px monospace";
        ctx.fillText("Press Reset to Reboot", canvas.width / 2, canvas.height / 2 + 50);
    }

    function restart() {
        clearInterval(gameLoop);
        score = 0;
        scoreEl.innerText = score;
        dx = 0;
        dy = -1;
        speed = 100;
        snake = [
            { x: 10, y: 10 },
            { x: 10, y: 11 },
            { x: 10, y: 12 }
        ];
        spawnFood();
        gameLoop = setInterval(draw, speed);
    }

    // Controls
    window.addEventListener("keydown", (e) => {
        switch (e.key) {
            case "ArrowUp": if (dy === 0) { dx = 0; dy = -1; } break;
            case "ArrowDown": if (dy === 0) { dx = 0; dy = 1; } break;
            case "ArrowLeft": if (dx === 0) { dx = -1; dy = 0; } break;
            case "ArrowRight": if (dx === 0) { dx = 1; dy = 0; } break;
        }
    });

    // Mobile buttons
    document.getElementById("m-up").onclick = () => { if (dy === 0) { dx = 0; dy = -1; } };
    document.getElementById("m-down").onclick = () => { if (dy === 0) { dx = 0; dy = 1; } };
    document.getElementById("m-left").onclick = () => { if (dx === 0) { dx = -1; dy = 0; } };
    document.getElementById("m-right").onclick = () => { if (dx === 0) { dx = 1; dy = 0; } };

    resetBtn.addEventListener("click", restart);

    // Initial Start
    restart();
});
