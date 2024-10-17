import kaplay, { type GameObj, type Vec2 } from "kaplay";

const game = kaplay({
	background: [74, 48, 82],
});

const objs = [
	"apple",
	"coin",
	"door",
	"egg",
	"key",
	"lightening",
	"meat",
	"mushroom",
];

for (const obj of objs) {
	game.loadSprite(obj, `/sprites/${obj}.png`);
}

game.loadBean();
game.loadSound("hit", "/sounds/hit.mp3");
game.loadSound("shoot", "/sounds/shoot.mp3");
game.loadSound("explode", "/sounds/explode.mp3");
game.loadSound("OtherworldlyFoe", "/sounds/OtherworldlyFoe.mp3");

game.scene("battle", () => {
	const BULLET_SPEED = 1200;
	const TRASH_SPEED = 120;
	const BOSS_SPEED = 48;
	const PLAYER_SPEED = 480;
	const BOSS_HEALTH = 10;
	const OBJ_HEALTH = 4;

	const bossName = game.choose(objs);

	let insaneMode = false;

	const music = game.play("OtherworldlyFoe");

	game.volume(0.5);

	function grow(rate: number) {
		return {
			update(this: GameObj) {
				const n = rate * game.dt();
				this.scale.x += n;
				this.scale.y += n;
			},
		};
	}

	function late(t: number) {
		let timer = 0;
		return {
			add(this: GameObj) {
				this.hidden = true;
			},
			update(this: GameObj) {
				timer += game.dt();
				if (timer >= t) {
					this.hidden = false;
				}
			},
		};
	}

	game.add([
		game.text("KILL", { size: 160 }),
		game.pos(game.width() / 2, game.height() / 2),
		game.anchor("center"),
		game.opacity(),
		game.lifespan(1),
		game.fixed(),
	]);

	game.add([
		game.text("THE", { size: 80 }),
		game.pos(game.width() / 2, game.height() / 2),
		game.anchor("center"),
		game.opacity(),
		game.lifespan(2),
		late(1),
		game.fixed(),
	]);

	game.add([
		game.text(bossName.toUpperCase(), { size: 120 }),
		game.pos(game.width() / 2, game.height() / 2),
		game.anchor("center"),
		game.opacity(),
		game.lifespan(4),
		late(2),
		game.fixed(),
	]);

	const sky = game.add([
		game.rect(game.width(), game.height()),
		game.color(0, 0, 0),
		game.opacity(0),
	]);

	sky.onUpdate(() => {
		if (insaneMode) {
			const t = game.time() * 10;
			sky.color.r = game.wave(127, 255, t);
			sky.color.g = game.wave(127, 255, t + 1);
			sky.color.b = game.wave(127, 255, t + 2);
			sky.opacity = 1;
		} else {
			sky.color = game.rgb(0, 0, 0);
			sky.opacity = 0;
		}
	});

	const player = game.add([
		game.sprite("bean"),
		game.area(),
		game.pos(game.width() / 2, game.height() - 64),
		game.anchor("center"),
	]);

	game.onKeyDown("left", () => {
		player.move(-PLAYER_SPEED, 0);
		if (player.pos.x < 0) {
			player.pos.x = game.width();
		}
	});

	game.onKeyDown("right", () => {
		player.move(PLAYER_SPEED, 0);
		if (player.pos.x > game.width()) {
			player.pos.x = 0;
		}
	});

	game.onKeyPress("up", () => {
		insaneMode = true;
		music.speed = 2;
	});

	game.onKeyRelease("up", () => {
		insaneMode = false;
		music.speed = 1;
	});

	player.onCollide("enemy", (e) => {
		game.destroy(e);
		game.destroy(player);
		game.shake(120);
		game.play("explode");
		music.detune = -1200;
		addExplode(game.center(), 12, 120, 30);
		game.wait(1, () => {
			music.paused = true;
			game.go("battle");
		});
	});

	function addExplode(p: Vec2, n: number, rad: number, size: number) {
		for (let i = 0; i < n; i++) {
			game.wait(game.rand(n * 0.1), () => {
				for (let i = 0; i < 2; i++) {
					game.add([
						game.pos(p.add(game.rand(game.vec2(-rad), game.vec2(rad)))),
						game.rect(4, 4),
						game.scale(1 * size, 1 * size),
						game.opacity(),
						game.lifespan(0.1),
						grow(game.rand(48, 72) * size),
						game.anchor("center"),
					]);
				}
			});
		}
	}

	function spawnBullet(p: Vec2) {
		game.add([
			game.rect(12, 48),
			game.area(),
			game.pos(p),
			game.anchor("center"),
			game.color(127, 127, 255),
			game.outline(4),
			game.move(game.UP, BULLET_SPEED),
			game.offscreen({ destroy: true }),
			// strings here means a tag
			"bullet",
		]);
	}

	game.onUpdate("bullet", (b) => {
		if (insaneMode) {
			b.color = game.rand(game.rgb(0, 0, 0), game.rgb(255, 255, 255));
		}
	});

	game.onKeyPress("space", () => {
		spawnBullet(player.pos.sub(16, 0));
		spawnBullet(player.pos.add(16, 0));
		game.play("shoot", {
			volume: 0.3,
			detune: game.rand(-1200, 1200),
		});
	});

	function spawnTrash() {
		const name = game.choose(objs.filter((n) => n !== bossName));
		game.add([
			game.sprite(name),
			game.area(),
			game.pos(game.rand(0, game.width()), 0),
			game.health(OBJ_HEALTH),
			game.anchor("bot"),
			"trash",
			"enemy",
			{ speed: game.rand(TRASH_SPEED * 0.5, TRASH_SPEED * 1.5) },
		]);
		game.wait(insaneMode ? 0.1 : 0.3, spawnTrash);
	}

	const boss = game.add([
		game.sprite(bossName),
		game.area(),
		game.pos(game.width() / 2, 40),
		game.health(BOSS_HEALTH),
		game.scale(3),
		game.anchor("top"),
		"enemy",
		{
			dir: 1,
		},
	]);

	game.on("death", "enemy", (e) => {
		game.destroy(e);
		game.shake(2);
		game.addKaboom(e.pos);
	});

	game.on("hurt", "enemy", () => {
		game.shake(1);
		game.play("hit", {
			detune: game.rand(-1200, 1200),
			speed: game.rand(0.2, 2),
		});
	});

	const timer = game.add([
		game.text("0"),
		game.pos(12, 32),
		game.fixed(),
		{ time: 0 },
	]);

	timer.onUpdate(() => {
		timer.time += game.dt();
		timer.text = timer.time.toFixed(2);
	});

	game.onCollide("bullet", "enemy", (b, e) => {
		game.destroy(b);
		e.hurt(insaneMode ? 10 : 1);
		addExplode(b.pos, 1, 24, 1);
	});

	game.onUpdate("trash", (t) => {
		t.move(0, t.speed * (insaneMode ? 5 : 1));
		if (t.pos.y - t.height > game.height()) {
			game.destroy(t);
		}
	});

	boss.onUpdate(() => {
		boss.move(BOSS_SPEED * boss.dir * (insaneMode ? 3 : 1), 0);
		if (boss.dir === 1 && boss.pos.x >= game.width() - 20) {
			boss.dir = -1;
		}
		if (boss.dir === -1 && boss.pos.x <= 20) {
			boss.dir = 1;
		}
	});

	boss.onHurt(() => {
		healthbar.set(boss.hp());
	});

	boss.onDeath(() => {
		music.stop();
		game.go("win", {
			time: timer.time,
			boss: bossName,
		});
	});

	const healthbar = game.add([
		game.rect(game.width(), 24),
		game.pos(0, 0),
		game.color(107, 201, 108),
		game.fixed(),
		{
			max: BOSS_HEALTH,
			flash: false,
			set(this: GameObj, hp: number) {
				this.width = (game.width() * hp) / this.max;
				this.flash = true;
			},
		},
	]);

	healthbar.onUpdate(() => {
		if (healthbar.flash) {
			healthbar.color = game.rgb(255, 255, 255);
			healthbar.flash = false;
		} else {
			healthbar.color = game.rgb(127, 255, 127);
		}
	});

	game.add([
		game.text("UP: insane mode", { width: game.width() / 2, size: 32 }),
		game.anchor("botleft"),
		game.pos(24, game.height() - 24),
	]);

	spawnTrash();
});

game.scene("win", ({ time, boss }) => {
	const b = game.burp({
		loop: true,
	});

	game.loop(0.5, () => {
		b.detune = game.rand(-1200, 1200);
	});

	game.add([
		game.sprite(boss),
		game.color(255, 0, 0),
		game.anchor("center"),
		game.scale(8),
		game.pos(game.width() / 2, game.height() / 2),
	]);

	game.add([
		game.text(time.toFixed(2), { size: 24 }),
		game.anchor("center"),
		game.pos(game.width() / 2, game.height() / 2),
	]);
});

game.go("battle");
