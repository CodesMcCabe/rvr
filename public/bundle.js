(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
let hitboxes = require('./hitboxes');

var config = {
  type: Phaser.AUTO,
  parent: 'phaser-example',
  width: 320,
  height: 240,
  physics: {
    default: 'arcade',
    arcade: {
      debug: true,
      gravity: { y: 0 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

var game = new Phaser.Game(config);

function preload() {
    this.load.image('tiles', 'assets/map/spritesheet.png');
    // map in json format
    this.load.tilemapTiledJSON('map', 'assets/map/map.json');
    this.load.spritesheet('player', 'assets/link_walk.png', { frameWidth: 50, frameHeight: 50 });

    this.load.spritesheet('attack', 'assets/link_attack.png', {frameWidth: 50, frameHeight: 50});
}

function create() {
    var self = this;
    this.attack = false;
    this.currentPlayerDirection = 'down';
    var map = this.make.tilemap({ key: 'map'});
    var tiles = map.addTilesetImage('spritesheet', 'tiles');

	var grass = map.createStaticLayer('Grass', tiles, 0, 0);
    this.physics.world.bounds.width = map.widthInPixels;
    this.physics.world.bounds.height = map.heightInPixels;

    this.obstacles = map.createStaticLayer('Obstacles', tiles, 0, 0);
    this.obstacles.setCollisionByExclusion([-1]);

    this.spawns = this.physics.add.group({ classType: Phaser.GameObjects.Zone });
    for(var i = 0; i < 30; i++) {
        var x = Phaser.Math.RND.between(0, this.physics.world.bounds.width);
        var y = Phaser.Math.RND.between(0, this.physics.world.bounds.height);
        // parameters are x, y, width, height
        this.spawns.create(x, y, 20, 20);
    }

    this.socket = io();
    this.otherPlayers = this.physics.add.group();
    this.socket.on('currentPlayers', function(players) {
        Object.keys(players).forEach(function (id) {
            if (players[id].playerId === self.socket.id) {
                addPlayer(self, players[id]);
            } else {
                addOtherPlayer(self, players[id]);
            }
        });
    });

    this.socket.on('newPlayer', function(playerInfo) {
        addOtherPlayer(self, playerInfo);
    })

    this.socket.on('playerMoved', function (playerInfo) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (playerInfo.playerId === otherPlayer.playerId) {
          if(playerInfo.animation === 'stop') {
              otherPlayer.anims.stop();
          } else {
              otherPlayer.anims.play(playerInfo.animation, true);
          }
          otherPlayer.setPosition(playerInfo.x, playerInfo.y);
        }
        });
    });

    this.socket.on('disconnect', function(playerId) {
        self.otherPlayers.getChildren().forEach(function(otherPlayer) {
            if(playerId === otherPlayer.playerId) {
                otherPlayer.destroy();
            }
        });
    });

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.roundPixels = true;

    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('player', { frames: [1, 5]}),
        frameRate: 10,
        loop: false,
    })
    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('player', { frames: [2, 6] }),
        frameRate: 10,
        loop: false,
    });
    this.anims.create({
        key: 'up',
        frames: this.anims.generateFrameNumbers('player', { frames: [3, 7]}),
        frameRate: 10,
        loop: false,
    });
    this.anims.create({
        key: 'down',
        frames: this.anims.generateFrameNumbers('player', { frames: [0, 4] }),
        frameRate: 10,
        loop: false,
    });
    this.anims.create({
        key: 'atk-left',
        frames: this.anims.generateFrameNumbers('attack', { frames: [1, 5, 9] }),
        frameRate: 60,
        loop: false
    });
    this.anims.create({
        key: 'atk-right',
        frames: this.anims.generateFrameNumbers('attack', { frames: [2, 6, 10] }),
        frameRate: 60,
        loop: false
    });
    this.anims.create({
        key: 'atk-up',
        frames: this.anims.generateFrameNumbers('attack', { frames: [3, 7, 11] }),
        frameRate: 60,
        loop: false
    });
    this.anims.create({
        key: 'atk-down',
        frames: this.anims.generateFrameNumbers('attack', { frames: [0, 4, 8] }),
        frameRate: 60,
        loop: false,
        onComplete: resetAttack,
    });


    this.cursors = this.input.keyboard.createCursorKeys();
}

function resetAttack() {
    this.attack = false;
    // debugger
    // switch(this.currentPlayerDirection) {
    //     case 'left':
    //         this.player.anims.play('left', false);
    //         break;
    //     case 'right':
    //         this.player.anims.play('right', false);
    //         break;
    //     case 'up':
    //         this.player.anims.play('up', false);
    //         break;
    //     case 'down':
    //         this.player.anims.play('down', false);
    //         break;
    //     default:
    //         break;
    // }
}

function onMeetEnemy(player, zone) {
    // zone.x = Phaser.Math.RND.between(0, this.physics.world.bounds.width);
    // zone.y = Phaser.Math.RND.between(0, this.physics.world.bounds.height);
    //
    // this.cameras.main.shake(300);
}

function addPlayer(self, playerInfo) {
    self.player = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'player', 1);
    console.log(self.player)
    self.player.body.setSize(20, 20, 10, 10);
    // self.player.scal = 30;
    self.cameras.main.startFollow(self.player);
    self.physics.add.collider(self.player, self.obstacles);
    self.physics.add.overlap(self.player, self.spawns, onMeetEnemy, null, self);

    self.player.setCollideWorldBounds(true);

    self.player.setVelocity(0);
}

function addOtherPlayer(self, playerInfo) {
    const otherPlayer = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'player').setOrigin(0.5, 0.5);
    otherPlayer.body.setSize(20, 20, 10, 10);
    otherPlayer.playerId = playerInfo.playerId;
    self.otherPlayers.add(otherPlayer);
}

function update() {
    var animation;
    var flip;

    if (this.player) {
        this.player.body.setVelocity(0);
        if (this.cursors.left.isDown)
        {
            this.player.body.setVelocityX(-100);
            this.player.anims.play('left', true);
            // this.player.flipX = true;
            animation = 'left';
            this.currentPlayerDirection = 'left';
        }
        else if (this.cursors.right.isDown)
        {
            this.player.body.setVelocityX(100);
            this.player.anims.play('right', true);
            // this.player.flipX = false;
            animation = 'right';
            this.currentPlayerDirection = 'right';
        }
        // Vertical movement
        else if (this.cursors.up.isDown)
        {
            this.player.body.setVelocityY(-100);
            this.player.anims.play('up', true);
            animation = 'up';
            this.currentPlayerDirection = 'up';
        }
        else if (this.cursors.down.isDown)
        {
            this.player.body.setVelocityY(100);
            this.player.anims.play('down', true);
            animation = 'down';
            this.currentPlayerDirection = 'down';
        }
        else if (this.cursors.space.isDown)
        {
            this.attack = true;
            switch(this.currentPlayerDirection) {
                case 'left':
                    this.player.anims.play('atk-left', false);
                    break;
                case 'right':
                    this.player.anims.play('atk-right', false);
                    break;
                case 'up':
                    this.player.anims.play('atk-up', false);
                    break;
                case 'down':
                    this.player.anims.play('atk-down', false);
                    break;
                default:
                    break;
            }
        }
        else if (!this.attack)
        {
            this.player.anims.stop();
            animation = 'stop';
        }

        // emit player movement
        var x = this.player.x;
        var y = this.player.y;
        var r = this.player.rotation;
        if (this.player.oldPosition && (x !== this.player.oldPosition.x || y !== this.player.oldPosition.y || r !== this.player.oldPosition.rotation)) {
          this.socket.emit('playerMovement', { x: this.player.x, y: this.player.y, rotation: this.player.rotation, animation: animation});
        }
        // save old position data
        this.player.oldPosition = {
          x: this.player.x,
          y: this.player.y,
          rotation: this.player.rotation,
          animation: animation
        };
    }
}

},{"./hitboxes":2}],2:[function(require,module,exports){
const hitboxes = () => {
    return 'hello';
};

module.exports = hitboxes;

},{}]},{},[1]);
