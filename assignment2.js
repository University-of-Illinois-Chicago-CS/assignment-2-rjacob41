import vertexShaderSrc from './vertex.glsl.js';
import fragmentShaderSrc from './fragment.glsl.js'

var gl = null;
var vao = null;
var program = null;
var vertexCount = 0;
var uniformModelViewLoc = null;
var uniformProjectionLoc = null;
var heightmapData = null;

var vertices = [];
var panX = 0;
var panZ = 0;
var indexCount = 0;

function processImage(img)
{
	// draw the image into an off-screen canvas
	var off = document.createElement('canvas');
	
	var sw = img.width, sh = img.height;
	off.width = sw; off.height = sh;
	
	var ctx = off.getContext('2d');
	ctx.drawImage(img, 0, 0, sw, sh);
	
	// read back the image pixel data
	var imgd = ctx.getImageData(0,0,sw,sh);
	var px = imgd.data;
	
	// create a an array will hold the height value
	var heightArray = new Float32Array(sw * sh);
	
	// loop through the image, rows then columns
	for (var y=0;y<sh;y++) 
	{
		for (var x=0;x<sw;x++) 
		{
			// offset in the image buffer
			var i = (y*sw + x)*4;
			
			// read the RGB pixel value
			var r = px[i+0], g = px[i+1], b = px[i+2];
			
			// convert to greyscale value between 0 and 1
			var lum = (0.2126*r + 0.7152*g + 0.0722*b) / 255.0;

			// store in array
			heightArray[y*sw + x] = lum;
		}
	}

	return {
		data: heightArray,
		width: sw,
		height: sw
	};
}


window.loadImageFile = function(event)
{

	var f = event.target.files && event.target.files[0];
	if (!f) return;
	
	// create a FileReader to read the image file
	var reader = new FileReader();
	reader.onload = function() 
	{
		// create an internal Image object to hold the image into memory
		var img = new Image();
		img.onload = function() 
		{
			// heightmapData is globally defined
			heightmapData = processImage(img);
			
			////////////////////////////////////////////////////////////////////////
			/*
				TODO: using the data in heightmapData, create a triangle mesh
					heightmapData.data: array holding the actual data, note that 
					this is a single dimensional array the stores 2D data in row-major order

					heightmapData.width: width of map (number of columns)
					heightmapData.height: height of the map (number of rows)
			*/
			var width = heightmapData.width;
			var height = heightmapData.height;
			
			//vertices
			vertices = [];
			var yScale = 64.0 / 256.0, yShift = 16.0;
			
			for (var i = 0; i < height; i++){
				for (var j = 0; j < width; j++){
					var ht = heightmapData.data[j + width * i];
					var y = ht * 255.0;
					
					//console.log("ht: " + ht + " y: " + y);
					
					vertices.push( -height/2.0 + i);
					vertices.push(y * yScale - yShift);
					vertices.push( -width/2.0 + j);
					
				}
			}
			vertexCount = vertices.length / 3;
			
			console.log(vertices);
			console.log('vertex count: ' + vertexCount);
			
			//indices
			var indices = [];
			
			for(var i = 0; i < height-1; i++){
				for(var j = 0; j < width-1; j++){
					var tLeft = j + width * i;
					var tRight = (j+1) + width * i;
					var bLeft = j + width * (i+1);
					var bRight = (j+1) + width * (i+1);
					
					indices.push(tLeft);
					indices.push(bLeft);					
					indices.push(tRight);
					
					indices.push(tRight);
					indices.push(bLeft);
					indices.push(bRight);
					
				}
			}
			
			indexCount = indices.length;
			console.log('index count: ' + indexCount);	
			
			////////////////////////////////////////////////////////////////////////
			console.log('loaded image: ' + heightmapData.width + ' x ' + heightmapData.height);

			
			var vbo = gl.createBuffer();
			var ebo = gl.createBuffer();

			vao = gl.createVertexArray();
			gl.bindVertexArray(vao);

			gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);

			var posAttribLoc = gl.getAttribLocation(program, "position");
			gl.enableVertexAttribArray(posAttribLoc);
			gl.vertexAttribPointer(posAttribLoc, 3, gl.FLOAT, false, 0, 0);

			gl.bindVertexArray(null);
		};
		img.onerror = function() 
		{
			console.error("Invalid image file.");
			alert("The selected file could not be loaded as an image.");
		};

		// the source of the image is the data load from the file
		img.src = reader.result;
	};
	reader.readAsDataURL(f);
}


function setupViewMatrix(eye, target)
{
    var forward = normalize(subtract(target, eye));
    var upHint  = [0, 1, 0];

    var right = normalize(cross(forward, upHint));
    var up    = cross(right, forward);

    var view = lookAt(eye, target, up);
    return view;

}
function draw()
{
	var fovRadians = 90 * Math.PI / 180;
	var aspectRatio = +gl.canvas.width / +gl.canvas.height;
	var nearClip = 0.001;
	var farClip = 10000.0;

	// projections
	var proj = document.getElementById('projection');
	var projectionMatrix;	
	var fileWidth;
	var fileHeight;

	if(heightmapData){
		fileWidth = heightmapData.width;
		fileHeight = heightmapData.height;
	}
	else{
		fileWidth= 10;
		fileHeight= 10;
	}
	
	// perspective
	if( proj.value === 'perspective'){
		projectionMatrix = perspectiveMatrix(
			fovRadians,
			aspectRatio,
			nearClip,
			farClip,
		);
	}
	// orthographic
	else{
		var size = Math.max(fileWidth, fileHeight);
		var left = -size * aspectRatio;
		var right = size * aspectRatio;
		var bottom = -size;
		var top = size;
		
		projectionMatrix = orthographicMatrix(
			left,
			right,
			bottom,
			top,
			nearClip,
			farClip
		);
	}
	
	// eye and target
	var camDistance = Math.max(fileWidth,fileHeight);
	var eye = [0, camDistance * 0.5, camDistance];
	var target = [0, 0, 0];
	
	////////////////////////////////////////////////////////////////////////

	var modelMatrix = identityMatrix();

	////////////////////////////////////////////////////////////////////////
	
	// TODO: set up transformations to the model
	
	// Rotation
	var Yrotation = (parseInt(document.querySelector("#Yrotation").value) * Math.PI / 180);
	var Zrotation = (parseInt(document.querySelector("#Zrotation").value) * Math.PI / 180);

	//console.log(Yrotation + " " + Zrotation);
	
	var yMatrix = rotateYMatrix(Yrotation);
	var zMatrix = rotateZMatrix(Zrotation);
	
	var rotMatrix = multiplyMatrices(yMatrix, zMatrix);
	
	modelMatrix = multiplyMatrices(modelMatrix, rotMatrix);

	// Zoom
	var zoom = (parseInt(document.querySelector("#scale").value) + 1);
	var zoomMatrix = scaleMatrix(zoom,zoom,zoom);
	
	modelMatrix = multiplyMatrices(modelMatrix, zoomMatrix);
	//console.log(zoom);
	
	// Height
	var height = (parseInt(document.querySelector("#height").value));
	var heightMatrix = scaleMatrix(1, height* .01, 1);
	
	modelMatrix = multiplyMatrices(modelMatrix, heightMatrix);
	//console.log(height);
		
	////////////////////////////////////////////////////////////////////////
	
	// setup viewing matrix
	var eyeToTarget = subtract(target, eye);
	var viewMatrix = setupViewMatrix(eye, target);
	
	
	// Panning
	var panMatrix = translateMatrix(panX, panZ,0);
	viewMatrix = multiplyMatrices(panMatrix, viewMatrix);
	console.log("X: " + panX + " Z: " + panZ);

	// model-view Matrix = view * model
	var modelviewMatrix = multiplyMatrices(viewMatrix, modelMatrix);


	// enable depth testing
	gl.enable(gl.DEPTH_TEST);

	// disable face culling to render both sides of the triangles
	gl.disable(gl.CULL_FACE);

	gl.clearColor(0.2, 0.2, 0.2, 1);
	gl.clear(gl.COLOR_BUFFER_BIT);

	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	gl.useProgram(program);
	
	// update modelview and projection matrices to GPU as uniforms
	gl.uniformMatrix4fv(uniformModelViewLoc, false, new Float32Array(modelviewMatrix));
	gl.uniformMatrix4fv(uniformProjectionLoc, false, new Float32Array(projectionMatrix));

	gl.bindVertexArray(vao);
	
	var primitiveType = gl.TRIANGLES;
	
	//keep starter box
	if(heightmapData){
		gl.drawElements(primitiveType, indexCount, gl.UNSIGNED_INT, 0);
	}
	else{
		gl.drawArrays(primitiveType, 0, vertexCount);
	}
	
	requestAnimationFrame(draw);
}

function createBox()
{
	function transformTriangle(triangle, matrix) {
		var v1 = [triangle[0], triangle[1], triangle[2], 1];
		var v2 = [triangle[3], triangle[4], triangle[5], 1];
		var v3 = [triangle[6], triangle[7], triangle[8], 1];

		var newV1 = multiplyMatrixVector(matrix, v1);
		var newV2 = multiplyMatrixVector(matrix, v2);
		var newV3 = multiplyMatrixVector(matrix, v3);

		return [
			newV1[0], newV1[1], newV1[2],
			newV2[0], newV2[1], newV2[2],
			newV3[0], newV3[1], newV3[2]
		];
	}

	var box = [];

	var triangle1 = [
		-1, -1, +1,
		-1, +1, +1,
		+1, -1, +1,
	];
	box.push(...triangle1)

	var triangle2 = [
		+1, -1, +1,
		-1, +1, +1,
		+1, +1, +1
	];
	box.push(...triangle2);

	// 3 rotations of the above face
	for (var i=1; i<=3; i++) 
	{
		var yAngle = i* (90 * Math.PI / 180);
		var yRotMat = rotateYMatrix(yAngle);

		var newT1 = transformTriangle(triangle1, yRotMat);
		var newT2 = transformTriangle(triangle2, yRotMat);

		box.push(...newT1);
		box.push(...newT2);
	}

	// a rotation to provide the base of the box
	var xRotMat = rotateXMatrix(90 * Math.PI / 180);
	box.push(...transformTriangle(triangle1, xRotMat));
	box.push(...transformTriangle(triangle2, xRotMat));


	return {
		positions: box
	};

}

var isDragging = false;
var startX, startY;
var leftMouse = false;

function addMouseCallback(canvas)
{
	isDragging = false;

	canvas.addEventListener("mousedown", function (e) 
	{
		if (e.button === 0) {
			console.log("Left button pressed");
			leftMouse = true;
		} else if (e.button === 2) {
			console.log("Right button pressed");
			leftMouse = false;
		}

		isDragging = true;
		startX = e.offsetX;
		startY = e.offsetY;
	});

	canvas.addEventListener("contextmenu", function(e)  {
		e.preventDefault(); // disables the default right-click menu
	});


	canvas.addEventListener("wheel", function(e)  {
		e.preventDefault(); // prevents page scroll

		var scaling = document.getElementById('scale');
		if (e.deltaY < 0) 
		{
			console.log("Scrolled up");
			scaling.value -= -1;
			console.log("scaling.value: " + scaling.value);
		} else {
			console.log("Scrolled down");
			scaling.value -= 1;
			console.log("scaling.value: " + scaling.value);
		}
	});

	document.addEventListener("mousemove", function (e) {
		if (!isDragging) return;
		var currentX = e.offsetX;
		var currentY = e.offsetY;
		
		console.log(startX + " to " + currentX);

		var deltaX = (currentX - startX) * Math.PI / 180;
		var deltaY = (currentY - startY) * Math.PI / 180;
		//console.log('mouse drag by: ' + deltaX + ', ' + deltaY);

		// implement dragging logic
		// Left mouse
		
		if(leftMouse){
			// Y Rotation
			var yrot = document.getElementById('Yrotation');
			yrot.value = parseInt(yrot.value, 10) + deltaX * 5;
			console.log(yrot.value);
			
			if(yrot.value == 360){
				yrot.value = 1;
			}
			else if(yrot.value == 0){
				yrot.value = 360;
			}
			
			// Z Rotation
			var zrot = document.getElementById('Zrotation');
			zrot.value = parseInt(zrot.value, 10) + deltaY * 5;
			console.log(zrot.value);
			
			if(zrot.value == 360){
				zrot.value = 1;
			}
			else if(zrot.value == 0){
				zrot.value = 360;
			}
		}
		else{
			// X Pan
			if(startX < currentX){
				panX +=  5;
				console.log("right");
			}
			else if(startX > currentX){
				panX -= 5;
				console.log("left");
			}			
			// Y Pan
			
			if(startY > currentY){
				panZ +=  5;
				console.log("up");
			}
			else if(startY < currentY){
				panZ -= 5;
				console.log("down");
			}
		}
		
		startX = currentX;
		startY = currentY;
	});

	document.addEventListener("mouseup", function () {
		isDragging = false;
	});

	document.addEventListener("mouseleave", () => {
		isDragging = false;
	});
}

function initialize() 
{
	var canvas = document.querySelector("#glcanvas");
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;

	gl = canvas.getContext("webgl2");

	// add mouse callbacks
	addMouseCallback(canvas);

	var box = createBox();
	vertexCount = box.positions.length / 3;		// vertexCount is global variable used by draw()
	console.log(box);

	// create buffers to put in box
	var boxVertices = new Float32Array(box['positions']);
	var posBuffer = createBuffer(gl, gl.ARRAY_BUFFER, boxVertices);

	var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
	var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
	program = createProgram(gl, vertexShader, fragmentShader);

	// attributes (per vertex)
	var posAttribLoc = gl.getAttribLocation(program, "position");

	// uniforms
	uniformModelViewLoc = gl.getUniformLocation(program, 'modelview');
	uniformProjectionLoc = gl.getUniformLocation(program, 'projection');

	vao = createVAO(gl, 
		// positions
		posAttribLoc, posBuffer, 

		// normals (unused in this assignments)
		null, null, 

		// colors (not needed--computed by shader)
		null, null
	);

	window.requestAnimationFrame(draw);
}

window.onload = initialize();