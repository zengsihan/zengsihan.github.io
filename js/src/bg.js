
// 当动画在画布上,最好使用requestAnimationFrame代替setTimeout和setInterval
// 不是所有浏览器都支持，有时需要一个前缀,所以我们需要一个垫片
window.requestAnimFrame = ( function() {
	return window.requestAnimationFrame ||
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame ||
				function( callback ) {
					window.setTimeout( callback, 1000 / 60 );
				};
})();

var canvas = document.getElementById( 'canvas' ),
		ctx = canvas.getContext( '2d' ),
		// 全屏幕尺寸
		cw = window.innerWidth,
		ch = window.innerHeight,
		// 烟花的集合
		fireworks = [],
		// 粒子的集合
		particles = [],
		// 开始的色调
		hue = 120,
		// 用于控制鼠标点击时发射烟花的个数
		limiterTotal = 5,
		limiterTick = 0,
		// 用于控制自动发射的速度
		timerTotal = 50,
		timerTick = 0,
		mousedown = false,
		// 鼠标的X坐标
		mx,
		// 鼠标的Y坐标
		my;

		//是否开启自动发射
		isLunch=true;

		// 自动发射的坐标
		var ax, ay;
		// 控制自动发射轨迹的判断
		var f=0;
		
// 设置画布尺寸
canvas.width = cw;
canvas.height = ch;

// 现在我们将为整个演示设置函数占位符

// 在一个范围内得到一个随机数
function random( min, max ) {
	return Math.random() * ( max - min ) + min;
}

// 计算两点之间的距离
function calculateDistance( p1x, p1y, p2x, p2y ) {
	var xDistance = p1x - p2x,
			yDistance = p1y - p2y;
	return Math.sqrt( Math.pow( xDistance, 2 ) + Math.pow( yDistance, 2 ) );
}

// create firework
function Firework( sx, sy, tx, ty ) {
	// 实际坐标 
	this.x = sx;
	this.y = sy;
	// 起始坐标
	this.sx = sx;
	this.sy = sy;
	// 靶点坐标
	this.tx = tx;
	this.ty = ty;
	// 从起点到目标的距离
	this.distanceToTarget = calculateDistance( sx, sy, tx, ty );
	this.distanceTraveled = 0;
	// 跟踪每一个烟花的过去坐标，创造出一个轨迹效果，增加坐标数以创造更显著的轨迹
	this.coordinates = []; //坐标集合
	this.coordinateCount = 3; //坐标数
	// 用当前坐标填充初始坐标集合
	while( this.coordinateCount-- ) {
		this.coordinates.push( [ this.x, this.y ] );
	}
	// 角度
	this.angle = Math.atan2( ty - sy, tx - sx );
	// 速度
	this.speed = 2;
	// 加速度
	this.acceleration = 1.05;
	// 亮度
	this.brightness = random( 50, 70 );
	// 目标圆的半径
	this.targetRadius = 1;
}

// 更新烟花
Firework.prototype.update = function( index ) {
	// 删除坐标数组中的最后一项
	this.coordinates.pop();
	// 将当前坐标添加到数组的开头
	this.coordinates.unshift( [ this.x, this.y ] );
	
	// 目标圆的周期半径
	if( this.targetRadius < 4 ) {
		this.targetRadius += 0.3;
	} else {
		this.targetRadius = 1;
	}
	
	// 加快烟花的发射速度
	this.speed *= this.acceleration;
	
	// 根据角度和速度获得当前速度
	var vx = Math.cos( this.angle ) * this.speed,
		vy = Math.sin( this.angle ) * this.speed;
	// 加速度用在烟花发射的路程有多远。
	this.distanceTraveled = calculateDistance( this.sx, this.sy, this.x + vx, this.y + vy );
	
	// 如果距离移动，包括速度，大于初始距离目标，那么目标就已经达到了
	if( this.distanceTraveled >= this.distanceToTarget ) {
		createParticles( this.tx, this.ty );
		// 删除firework，使用传递到更新函数中的索引来确定要删除哪些内容
		fireworks.splice( index, 1 );
	} else {
		// 目标未达到，继续前行
		this.x += vx;
		this.y += vy;
	}
}

// 画烟花
Firework.prototype.draw = function() {
	ctx.beginPath();
	// 移动到集合中的最后一个跟踪坐标，然后绘制一条线到当前的x和y，就是画发射轨迹。
	ctx.moveTo( this.coordinates[ this.coordinates.length - 1][ 0 ], this.coordinates[ this.coordinates.length - 1][ 1 ] );
	ctx.lineTo( this.x, this.y );
	ctx.strokeStyle = 'hsl(' + hue + ', 100%, ' + this.brightness + '%)';
	ctx.stroke();
	
	ctx.beginPath();
	// 用脉冲圈画出这个烟花的目标圆圈
	ctx.arc( this.tx, this.ty, this.targetRadius, 0, Math.PI * 2 );
	ctx.stroke();
}

// 创造烟花效果的粒子
function Particle( x, y ) {
	this.x = x;
	this.y = y;
	// 跟踪每一个粒子的过去坐标，创造出一个轨迹效应，增加坐标计数以创造更显著的轨迹
	this.coordinates = [];
	this.coordinateCount = 5;
	while( this.coordinateCount-- ) {
		this.coordinates.push( [ this.x, this.y ] );
	}
	// 在所有可能的方向上设置一个随机角度，从弧度上
	this.angle = random( 0, Math.PI * 2 );
	// 速度
	this.speed = random( 1, 10 );
	// 摩擦力会使粒子减速
	this.friction = 0.95;
	// 重力将被应用并将粒子拉下
	this.gravity = 1;
	// 将色调设置为一个随机数字 +-20 的整体色调变量
	this.hue = random( hue - 40, hue + 40 );
	// 亮度
	this.brightness = random( 50, 100 );
	// 透明度
	this.alpha = 1;
	// 确定粒子逐渐消失的速度
	this.decay = random( 0.015, 0.025 ); // 衰退
}

// 更新烟花效果的粒子
Particle.prototype.update = function( index ) {
	// 删除坐标数组中的最后一项
	this.coordinates.pop();
	// 将当前坐标添加到数组的开头
	this.coordinates.unshift( [ this.x, this.y ] );
	// 减缓粒子的速度
	this.speed *= this.friction;
	// 加上角度和重力来修改速度
	this.x += Math.cos( this.angle ) * this.speed;
	this.y += Math.sin( this.angle ) * this.speed + this.gravity;
	// 淡出粒子
	this.alpha -= this.decay;
	
	// 当alpha值足够低时，根据索引的传递，删除该粒子
	if( this.alpha <= this.decay ) {
		particles.splice( index, 1 );
	}
}

// 画出粒子，就是烟花效果
Particle.prototype.draw1 = function() {
	ctx. beginPath();
	// 移动到集合中的最后一个跟踪坐标，然后绘制一条线到当前的x和y， 就是画烟花效果轨迹
	ctx.moveTo( this.coordinates[ this.coordinates.length - 1 ][ 0 ], this.coordinates[ this.coordinates.length - 1 ][ 1 ] );
	ctx.lineTo( this.x, this.y );
	ctx.strokeStyle = 'hsla(' + this.hue + ', 100%, ' + this.brightness + '%, ' + this.alpha + ')';
	ctx.stroke();
}

// Draws the particle
Particle.prototype.draw2 = function() {
    var radius = Math.round(random(3, 5));

    // Create a new shiny gradient
    var gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius);
    gradient.addColorStop(0.0, 'white');
    gradient.addColorStop(0.1, 'white');
    gradient.addColorStop(0.1, 'hsla(' + this.hue + ',100%,' + this.brightness + '%,' + this.alpha + ')');
    gradient.addColorStop(1.0, 'black');

    // Draw the gradient
    ctx.beginPath();
    ctx.fillStyle = gradient;
    ctx.arc(this.x, this.y, radius, Math.PI * 2, false);
    ctx.fill();
}


// 创建粒子组/爆炸效果
function createParticles( x, y ) {
	// 增加粒子数的更大爆炸，注意到画布的性能受到增加粒子的影响
	var particleCount = 30;
	while( particleCount-- ) {
		particles.push( new Particle( x, y ) );
	}
}

// 自动发射的轨迹
function AutoFire(){
	fireworks.push( new Firework( cw / 2, ch, 26*cw/100, 52*ch/100) );
	fireworks.push( new Firework( cw / 2, ch, 30*cw/100, 40*ch/100) );
	fireworks.push( new Firework( cw / 2, ch, 36*cw/100, 32*ch/100) );
	fireworks.push( new Firework( cw / 2, ch, 43*cw/100, 27*ch/100) );

	fireworks.push( new Firework( cw / 2, ch, 50*cw/100, 25*ch/100) );

	fireworks.push( new Firework( cw / 2, ch, 57*cw/100, 27*ch/100) );
	fireworks.push( new Firework( cw / 2, ch, 64*cw/100, 32*ch/100) );
	fireworks.push( new Firework( cw / 2, ch, 70*cw/100, 40*ch/100) );
	fireworks.push( new Firework( cw / 2, ch, 74*cw/100, 52*ch/100) );
}
function AutoFire1(flag){
	if(flag==1)
		fireworks.push( new Firework( cw / 2, ch, 26*cw/100, 52*ch/100) );
	if(flag==2)
		fireworks.push( new Firework( cw / 2, ch, 30*cw/100, 40*ch/100) );
	if(flag==3)
		fireworks.push( new Firework( cw / 2, ch, 36*cw/100, 32*ch/100) );
	if(flag==4)
		fireworks.push( new Firework( cw / 2, ch, 43*cw/100, 27*ch/100) );
	if(flag==5)
		fireworks.push( new Firework( cw / 2, ch, 50*cw/100, 25*ch/100) );
	if(flag==6)
		fireworks.push( new Firework( cw / 2, ch, 57*cw/100, 27*ch/100) );
	if(flag==7)
		fireworks.push( new Firework( cw / 2, ch, 64*cw/100, 32*ch/100) );
	if(flag==8)
		fireworks.push( new Firework( cw / 2, ch, 70*cw/100, 40*ch/100) );
	if(flag==9)
		fireworks.push( new Firework( cw / 2, ch, 74*cw/100, 52*ch/100) );
}

// 主循环
function loop() {
	// 这个函数将与 requestAnimationFrame 无休止地运行
	requestAnimFrame( loop );
	
	// 随着时间的推移，增加不同颜色的烟花
	hue += 0.5;
	
	// 通常，clearRect()将被用来清除画布
	// 我们想要创建一个拖尾效应
	// 将复合操作设置为destin-out将允许我们以特定的不透明度清除画布，而不是完全清除画布
	ctx.globalCompositeOperation = 'destination-out';
	// 减少alpha属性，创建更突出的路径
	ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
	ctx.fillRect( 0, 0, cw, ch );
	// 将复合操作更改回主模式
	// 当烟花发射到目标时，产生打火机一样的明亮效果
	ctx.globalCompositeOperation = 'lighter';
	
	// 循环每一个烟花，绘制它，更新它
	var i = fireworks.length;
	while( i-- ) {
		fireworks[ i ].draw();
		fireworks[ i ].update( i );
	}
	
	// 循环每一个粒子，绘制它，更新它
	var i = particles.length;
	while( i-- ) {
	    //烟花效果选择
        if(i%2 == 0){
		    particles[ i ].draw1();
        }else {
		    particles[ i ].draw2();
        }
		particles[ i ].update( i );
	}
	
	// 当鼠标不点击时，自动将烟花发射到随机坐标
	if( timerTick >= timerTotal ) {
		if( !mousedown && isLunch==true) {
			// 在屏幕的底部启动firework，然后设置随机目标坐标，随机y坐标将设置在屏幕的上半部分
			// fireworks.push( new Firework( cw / 2, ch, random( 0, cw ), random( 0, ch / 2 ) ) );

			// 自动发射轨迹的方法。
			// AutoFire();
			
			if(f<9){
				f++;
				AutoFire1(f);
			}else{
				f=1;
				AutoFire();
			}
			

			timerTick = 0;
		}
	} else {
		timerTick++;
	}
	
	// 当鼠标点击时，限制燃放烟花的速度
	if( limiterTick >= limiterTotal ) {
		if( mousedown ) {
			// 启动屏幕底部的firework，然后将当前的鼠标坐标设置为目标
			fireworks.push( new Firework( cw / 2, ch, mx, my ) );
			limiterTick = 0;
		}
	} else {
		limiterTick++;
	}
}

// 鼠标事件绑定
// 在mousemove上更新鼠标坐标
canvas.addEventListener( 'mousemove', function( e ) {
	mx = e.pageX - canvas.offsetLeft;
	my = e.pageY - canvas.offsetTop;
});

// 切换鼠标状态，防止画布被选中
canvas.addEventListener( 'mousedown', function( e ) {
	e.preventDefault();//阻止滚动
	mousedown = true;
});

canvas.addEventListener( 'mouseup', function( e ) {
	e.preventDefault();
	mousedown = false;
});

// 添加移动端的监听事件
canvas.addEventListener('touchmove',function(e){
	mx=e.touches[0].pageX;
	my=e.touches[0].pageY;
});

canvas.addEventListener('touchstart',function(e){
	e.preventDefault();
	mousedown = true;
});

canvas.addEventListener('touchend',function(e){
	e.preventDefault();
	mousedown = false;
});

// 一旦打开窗口，就准备好放烟火了!
window.onload = loop;


