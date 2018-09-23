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
    // this.load.image('ship', 'assets/spaceShips_001.png');
    // this.load.image('otherPlayer', 'assets/enemyBlack5.png');
    // this.load.image('star', 'assets/star_gold.png');
    this.load.image('tiles', 'assets/map/spritesheet.png');

    // map in json format
    this.load.tilemapTiledJSON('map', 'assets/map/map.json');

    // player sprite
    this.load.spritesheet('player', 'assets/RPG_assets.png', { frameWidth: 16, frameHeight: 16 });
}

function create() {
    var self = this;
    var map = this.make.tilemap({ key: 'map'});
    var tiles = map.addTilesetImage('spritesheet', 'tiles');

	var grass = map.createStaticLayer('Grass', tiles, 0, 0);
    this.physics.world.bounds.width = map.widthInPixels;
    this.physics.world.bounds.height = map.heightInPixels;

    this.obstacles = map.createStaticLayer('Obstacles', tiles, 0, 0);
    this.obstacles.setCollisionByExclusion([-1]);

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
          // otherPlayer.setRotation(playerInfo.rotation);
          if(playerInfo.animation === 'stop') {
              otherPlayer.anims.stop();
          } else {
              otherPlayer.anims.play(playerInfo.animation, true);
              if (playerInfo.animation === 'left') {
                  otherPlayer.flipX = true;
              } else if (playerInfo.animation === 'right') {
                  otherPlayer.flipX = false;
              }
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


    // this.blueScoreText = this.add.text(16, 16, '', { fontSize: '32px', fill: '#0000FF' });
    // this.redScoreText = this.add.text(584, 16, '', { fontSize: '32px', fill: '#FF0000' });

    // this.socket.on('scoreUpdate', function(scores) {
    //     self.blueScoreText.setText('Blue: ' + scores.blue);
    //     self.redScoreText.setText('Red: ' + scores.red);
    // });

    // this.socket.on('starLocation', function(starLocation) {
    //     if (self.star) self.star.destroy();
    //     self.star = self.physics.add.image(starLocation.x, starLocation.y, 'star');
    //     self.physics.add.overlap(self.ship, self.star, function() {
    //         this.socket.emit('starCollected');
    //     }, null, self);
    // });

    // tilemap


    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.roundPixels = true;

    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('player', { frames: [1, 7, 1, 13]}),
        frameRate: 10,
        repeat: -1
    })
    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('player', { frames: [1, 7, 1, 13] }),
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({
        key: 'up',
        frames: this.anims.generateFrameNumbers('player', { frames: [2, 8, 2, 14]}),
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({
        key: 'down',
        frames: this.anims.generateFrameNumbers('player', { frames: [ 0, 6, 0, 12 ] }),
        frameRate: 10,
        repeat: -1
    });


    // monster
    this.spawns = this.physics.add.group({ classType: Phaser.GameObjects.Zone });
    for(var i = 0; i < 30; i++) {
        var x = Phaser.Math.RND.between(0, this.physics.world.bounds.width);
        var y = Phaser.Math.RND.between(0, this.physics.world.bounds.height);
        // parameters are x, y, width, height
        this.spawns.create(x, y, 20, 20);
    }

    this.physics.add.overlap(this.player, this.spawns, onMeetEnemy, null, this);

    this.cursors = this.input.keyboard.createCursorKeys();
}

function onMeetEnemy(player, zone) {
    zone.x = Phaser.Math.RND.between(0, this.physics.world.bounds.width);
    zone.y = Phaser.Math.RND.between(0, this.physics.world.bounds.height);

    this.cameras.main.shake(300);
}

function addPlayer(self, playerInfo) {
    // self.ship = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'player').setOrigin(0.5, 0.5);
    self.player = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'player', 6);
    self.cameras.main.startFollow(self.player);
    self.physics.add.collider(self.player, self.obstacles);

    self.player.setCollideWorldBounds(true);
    // this.load.spritesheet('player', 'assets/RPG_assets.png',
    if (playerInfo.team === 'blue') {
        self.player.setTint(0x0000ff);
    } else {
        self.player.setTint(0xff0000);
    }

    self.player.setVelocity(0);
    // self.ship.setDrag(100);
    // self.ship.setAngularDrag(100);
    // self.ship.setMaxVelocity(200);
}

function addOtherPlayer(self, playerInfo) {
    const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'player').setOrigin(0.5, 0.5);
    if (playerInfo.team === 'blue') {
        otherPlayer.setTint(0x0000ff);
    } else {
        otherPlayer.setTint(0xff0000);
    }
    otherPlayer.playerId = playerInfo.playerId;
    self.otherPlayers.add(otherPlayer);
}

function update() {
    // this.player.body.setVelocity(0);
    // this.physics.overlap(this.player, this.spawns, this.onMeetEnemy, null, this);
    // Horizontal movement
    var animation;
    var flip;
    if (this.player) {
        this.player.body.setVelocity(0);
        if (this.cursors.left.isDown)
        {
            this.player.body.setVelocityX(-80);
            this.player.anims.play('left', true);
            this.player.flipX = true;
            animation = 'left';
        }
        else if (this.cursors.right.isDown)
        {
            this.player.body.setVelocityX(80);
            this.player.anims.play('right', true);
            this.player.flipX = false;
            animation = 'right';
        }
        // Vertical movement
        else if (this.cursors.up.isDown)
        {
            this.player.body.setVelocityY(-80);
            this.player.anims.play('up', true);
            animation = 'up';
        }
        else if (this.cursors.down.isDown)
        {
            this.player.body.setVelocityY(80);
            this.player.anims.play('down', true);
            animation = 'down';
        }
        else
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
