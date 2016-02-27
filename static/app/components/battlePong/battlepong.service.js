(function () {

    angular.module('flaederGamesApp')
        .factory('BattlePongService', [function () {

            var service = {};

            service.BALL_EDGES = 32;
            service.D_ANGLE = 2 * Math.PI / service.BALL_EDGES;
            service.canvas = angular.element("#battlePongCanvas")[0];
            service.screenRatio = service.canvas.height / service.canvas.width;

            service.initGame = function (vertexShader, fragmentShader) {
                this.gl = setupWebGL(service.canvas);

                this.gl.viewportWidth = this.canvas.width;
                this.gl.viewportHeight = this.canvas.height;

                this.program = createProgramFromScripts(this.gl, [vertexShader, fragmentShader]);

                // setup GLSL program
                this.gl.useProgram(this.program);

                // look up where the vertex data needs to go.
                this.positionLocation = this.gl.getAttribLocation(this.program, "aVertexPosition");
                this.colorLocation = this.gl.getUniformLocation(this.program, "uColor");
                this.translationLocation = this.gl.getUniformLocation(this.program, "uTranslation");
                this.scaleLocation = this.gl.getUniformLocation(this.program, "uScale");
            };

            service.drawBoard = function (board) {

            };

            service.ballBuffer = [0.0, 0.0];

            var angle = 0.0,
                i;
            for (i = 2; i < 2 * (service.BALL_EDGES + 1) + 2; i += 2) {
                service.ballBuffer[i] = Math.cos(angle) * service.screenRatio;
                service.ballBuffer[i + 1] = Math.sin(angle);
                angle += service.D_ANGLE;
            }

            service.paddleBuffer = [
                service.screenRatio, 1.0,
                -service.screenRatio, 1.0,
                -service.screenRatio, -1.0,
                service.screenRatio, -1.0
            ];

            service.drawBall = function (ball) {
                var buffer = this.gl.createBuffer();
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
                this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.ballBuffer), this.gl.STATIC_DRAW);
                this.gl.enableVertexAttribArray(this.gl.positionLocation);
                this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);

                this.gl.uniform4fv(this.colorLocation, ball.color);
                this.gl.uniform2fv(this.translationLocation, ball.position);
                this.gl.uniform2fv(this.scaleLocation, [ball.radius, ball.radius]);

                // draw
                this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, this.ballBuffer.length / 2);
            };

            service.handleWallBounce = function (ball) {
                // check wall bounce
                if (ball.position[0] + ball.radius > 1) {
                    ball.velocity[0] = -ball.velocity[0];
                    ball.position[0] = 0.9999 - ball.radius;
                } else if (ball.position[0] - ball.radius < -1) {
                    ball.velocity[0] = -ball.velocity[0];
                    ball.position[0] = -0.9999 + ball.radius;
                } else if (ball.position[1] + ball.radius > 1) {
                    ball.velocity[1] = -ball.velocity[1];
                    ball.position[1] = 0.9999 - ball.radius;
                } else if (ball.position[1] - ball.radius < -1) {
                    ball.velocity[1] = -ball.velocity[1];
                    ball.position[1] = -0.9999 + ball.radius;
                }
            };

            service.handlePaddleBounce = function (ball, paddle) {
                if (Math.abs(ball.position[0] - paddle.position[0]) < ball.radius + paddle.width / 2 &&
                    Math.abs(ball.position[1] - paddle.position[1]) < paddle.height) {
                    // collision!!
                    if (ball.velocity[0] < 0) {
                        ball.position[0] = paddle.position[0] + paddle.width / 2 + ball.radius + 0.00001;
                    } else {
                        ball.position[0] = paddle.position[0] - paddle.width / 2 - ball.radius - 0.00001;
                    }
                    ball.velocity[0] = -ball.velocity[0];
                } else if (Math.abs(ball.position[1] - paddle.position[1]) < ball.radius + paddle.height / 2 &&
                    Math.abs(ball.position[0] - paddle.position[0]) < paddle.width) {
                    // collision!!
                    if (ball.velocity[1] < 0) {
                        ball.position[1] = paddle.position[1] + paddle.height / 2 + ball.radius + 0.00001;
                    } else {
                        ball.position[1] = paddle.position[1] - paddle.height / 2 - ball.radius - 0.00001;
                    }
                    ball.velocity[1] = -ball.velocity[1];
                }
            };

            service.moveBall = function (ball, dt) {
                ball.position[0] += ball.velocity[0] * dt;
                ball.position[1] += ball.velocity[1] * dt;

                if (ball.position[0] > 1.0) {
                    ball.position[0] = 1.0;
                }

                if (ball.position[0] < -1.0) {
                    ball.position[0] = -1.0;
                }

                if (ball.position[1] > 1.0) {
                    ball.position[1] = 1.0;
                }

                if (ball.position[1] < -1.0) {
                    ball.position[1] = -1.0;
                }

            };

            service.movePaddle = function (paddle, dt) {
                // calculate speed
                paddle.velocity[0] += (paddle.refVelocity[0] - paddle.velocity[0]) * paddle.acceleration[0] * dt;
                paddle.velocity[1] += (paddle.refVelocity[1] - paddle.velocity[1]) * paddle.acceleration[1] * dt;

                // Update position
                paddle.position[0] += paddle.velocity[0] * dt;
                paddle.position[1] += paddle.velocity[1] * dt;

                // limit position
                if (paddle.position[0] + paddle.width / 2 > 1.0) {
                    paddle.position[0] = 1.0 - paddle.width / 2;
                    paddle.velocity[0] = 0.0;
                }
                if (paddle.position[0] - paddle.width / 2 < -1.0) {
                    paddle.position[0] = -1.0 + paddle.width / 2;
                    paddle.velocity[0] = 0.0;
                }
                if (paddle.position[1] + paddle.height / 2 > 1.0) {
                    paddle.position[1] = 1.0 - paddle.height / 2;
                    paddle.velocity[1] = 0.0;
                }
                if (paddle.position[1] - paddle.height / 2 < -1.0) {
                    paddle.position[1] = -1.0 + paddle.height / 2;
                    paddle.velocity[1] = 0.0;
                }
            };

            service.drawPaddle = function (paddle) {
                var buffer = this.gl.createBuffer();
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
                this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.paddleBuffer), this.gl.STATIC_DRAW);
                this.gl.enableVertexAttribArray(this.gl.positionLocation);
                this.gl.vertexAttribPointer(this.gl.positionLocation, 2, this.gl.FLOAT, false, 0, 0);
                this.gl.uniform4fv(this.colorLocation, paddle.color);

                this.gl.uniform4fv(this.colorLocation, paddle.color);
                this.gl.uniform2fv(this.translationLocation, paddle.position);
                this.gl.uniform2fv(this.scaleLocation, [paddle.width / 2, paddle.height / 2]);

                // draw
                this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, this.paddleBuffer.length / 2);
            };

            service.createBoard = function () {
                return {
                    balls: [],
                    paddles: [],

                    aspectRatio: 0.75,
                    boardEdge: 0.05,

                    createBall: function (radius) {
                        var b = {};

                        b.xspd = 0.0;
                        b.yspd = 0.0;
                        b.position[0] = 0.0;
                        b.ypos = 0.0;
                        b.radius = radius;

                        b.draw = function (gl) {

                        };

                        b.move = function (x, y) {
                            this.position[0] = x;
                            this.ypos = y;
                        };

                        b.moveBy = function (dt) {
                            this.xpos += dt * this.xspd;
                            this.ypos += dt * this.yspd;
                        };

                        b.setVelocity = function (dx, dy) {
                            this.xspd = dx;
                            this.yspd = dy;
                        };

                        b.getXPos = function () {
                            return this.xpos;
                        };

                        b.getYPos = function () {
                            return this.ypos;
                        };

                        b.handleCollision = function () {};

                        this.balls.push(b);
                    },

                    createPaddle: function (width) {
                        var p = {};

                        p.width = width;
                        p.length = 0.2;
                        p.xpos = 0.0;
                        p.ypos = 0.0;
                        p.velocity = 0.0;

                        p.draw = function (gl) {
                            // Create a buffer and put a single clipspace rectangle in
                            // it (2 triangles)
                            var buffer = gl.createBuffer();
                            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                            gl.bufferData(
                                gl.ARRAY_BUFFER,
                                new Float32Array([
                            this.xpos, this.ypos,
                            this.xpos, this.ypos + this.length,
                            this.xpos - this.width, this.ypos + this.length,
                            this.xpos, this.ypos,
                            this.xpos - this.width, this.ypos,
                            this.xpos - this.width, this.ypos + this.length]),
                                gl.STATIC_DRAW
                            );
                            gl.enableVertexAttribArray(gl.positionLocation);
                            gl.vertexAttribPointer(gl.positionLocation, 2, gl.FLOAT, false, 0, 0);

                            // draw
                            gl.drawArrays(gl.TRIANGLES, 0, 6);
                        };

                        p.move = function (x, y) {
                            this.xpos = x;
                            this.ypos = y;
                        };

                        p.moveBy = function (dt) {
                            this.ypos += dt * this.velocity;
                        };

                        p.setVelocity = function (dy) {
                            this.velocity = dy;
                        };

                        p.getPos = function () {
                            return this.ypos;
                        };

                        p.handleCollision = function () {
                            if (this.ypos < -0.9999) {
                                this.ypos = -0.9999;
                                this.velocity = -this.velocity;
                            } else if (this.ypos > 0.9999) {
                                this.ypos = 0.9999;
                                this.velocity = -this.velocity;
                            }
                        };

                        this.paddles.push(p);

                    },

                    draw: function (gl) {
                        var i;

                        for (i = 0; i < this.paddles.length; i++) {
                            this.paddles[i].draw(gl);
                        }

                        for (i = 0; i < this.balls.length; i++) {
                            this.balls[i].draw(gl);
                        }

                    },

                    updatePositions: function (dt) {
                        var i;

                        for (i = 0; i < this.paddles.length; i++) {
                            this.paddles[i].moveBy(dt);
                            this.paddles[i].handleCollision();
                        }

                        for (i = 0; i < this.balls.length; i++) {
                            this.balls[i].moveBy(dt);
                            this.balls[i].handleCollision();
                        }

                    },

                    update: function (dt, gl) {
                        this.updatePositions(dt);
                        this.draw(gl);
                    }
                };
            }

            return service;

        }]);

})();