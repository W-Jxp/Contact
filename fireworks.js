document.addEventListener('DOMContentLoaded', function () {
    const canvas = document.getElementById('fireworksCanvas');
    const ctx = canvas.getContext('2d');
    let fireworks = [];

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // 烟花粒子类
    class Firework {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = canvas.height;
            this.targetY = Math.random() * (canvas.height / 2);
            this.size = Math.random() * 2 + 1;
            this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
            this.speedY = Math.random() * 3; // 减慢升起速度
            this.speedX = Math.random() * 1 - 0.5; // 增加水平移动
            this.tail = []; // 保存尾迹位置的数组
        }

        update() {
            this.tail.push({ x: this.x, y: this.y }); // 将当前烟花位置加入尾迹
            if (this.tail.length > 15) this.tail.shift(); // 限制尾迹长度

            this.x += this.speedX; // 水平弯曲上升
            this.y -= this.speedY;

            if (this.y <= this.targetY) {
                this.explode();
                this.reset();
            }
        }

        draw() {
            // 绘制尾迹
            for (let i = 0; i < this.tail.length; i++) {
                let pos = this.tail[i];
                let alpha = i / this.tail.length; // 尾迹渐渐透明
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, this.size * (i / 10), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`; // 更加柔和的尾迹效果
                ctx.fill();
            }

            // 绘制烟花本体
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        explode() {
            const particlesCount = Math.random() * 150 + 250; // 增加爆炸粒子的数量
            for (let i = 0; i < particlesCount; i++) {
                fireworks.push(new Particle(this.x, this.y, this.color));
            }
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = canvas.height;
            this.targetY = Math.random() * (canvas.height / 2);
            this.tail = []; // 重置尾迹
        }
    }

    // 烟花爆炸粒子类
    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.size = Math.random() * 4 + 3; // 粒子更大
            this.speedX = (Math.random() * 6 - 3) * 0.4; // 调整散开速度，减慢散开
            this.speedY = (Math.random() * 6 - 3) * 0.4; // 调整散开速度，减慢散开
            this.color = color;
            this.opacity = 1; // 透明度用于渐变
            this.life = 400; // 增加粒子的寿命
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.size *= 0.97; // 粒子缩小得更慢
            this.opacity -= 0.006; // 透明度渐变得更慢
            this.life--;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.getColor()}, ${this.opacity})`;
            ctx.fill();
        }

        getColor() {
            // 获取爆炸粒子的颜色，随着生命减少，颜色会变化
            const hue = Math.random() * 360;
            return `${hue}, 100%, 50%`;
        }
    }

    // 创建和更新烟花粒子
    function handleFireworks() {
        fireworks.forEach((firework, index) => {
            firework.update();
            firework.draw();
            if (firework.size <= 0.1 || firework.life <= 0) {
                fireworks.splice(index, 1); // 移除已消失的粒子
            }
        });
    }

    // 初始化烟花
    function launchFirework() {
        fireworks.push(new Firework());
    }

    setInterval(launchFirework, 1000); // 每隔 1.5 秒发射一个烟花

    // 动画循环
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        handleFireworks();
        requestAnimationFrame(animate);
    }

    animate();
});

