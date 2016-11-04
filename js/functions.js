////////
/* JS */
////////

var pi = Math.PI;

/* returns scale matrix on arbitrary axis in world space, n - normal, s - scale factor */
var scaleMatrix = function( n, s ) {
	var m = new THREE.Matrix4();
	m.set(
        1 + ( s - 1 ) * n.x * n.x,     ( s - 1 ) * n.x * n.y,     ( s - 1 ) * n.x * n.z, 0,
		    ( s - 1 ) * n.y * n.x, 1 + ( s - 1 ) * n.y * n.y,     ( s - 1 ) * n.y * n.z, 0,
			( s - 1 ) * n.z * n.x,     ( s - 1 ) * n.z * n.y, 1 + ( s - 1 ) * n.z * n.z, 0,
                                0,                         0,                         0, 1
	);	
	return m;
};

/* returns complete transformation of the object in world space */
var transform = function( object, scene ) {
	var obj = object;
	var parents = [];
	var transform = new THREE.Matrix4();
	transform.multiply( scene.matrix );
	while ( true ) {
	    if ( obj.parent == scene ) {
			for ( var i = parents.length; i > 0; i-- ) transform.multiply( parents[ i - 1 ].matrix );
			break;
		} else { 
		    parents[ parents.length ] = obj.parent;
			obj = obj.parent;
		}
	}
	transform.multiply( object.matrix );	
    return transform;
};

var vec2 = function( x, y ) {
	return new THREE.Vector2( x, y );
};

var vec3 = function( x, y, z ) {
	return new THREE.Vector3( x, y, z );
};

var sceneVec3 = function( x, y, z ) {
	return new THREE.Vector3( x, y, z ).applyMatrix4( scene.matrix );
};

var sceneMat = function( vec3 ) {
    return vec3.applyMatrix4( scene.matrix );    
};

var tex = function( texture ) {
    return new THREE.TextureLoader().load( texture );   
};

var col = function( color ) {
    return new THREE.Color( color );   
};

var worldPos = function( obj ) {
    return obj.getWorldPosition();   
};

var FBO = function( width, height, options ) {
	return new THREE.WebGLRenderTarget( width, height, options );
};


//////////
/* GLSL */
//////////

/*
scaleMatrix()
Функция возвращает mat4 матрицу масштабирования вдоль нормали n с коеффициентом масштабирования s,
v - произвольная точка плоскости, вдоль нормали n которой происходит масштабирование.
Пример:
vec4 pos = modelMatrix * vec4( position, 1.0 );
vec3 newPos = ( scaleMatrix( n, s ) * pos ).xyz + n * ( 1.0 - s ) * dot( n, v );
gl_Position = projectionMatrix * viewMatrix * vec4( newPos, 1.0 );
*/
var scaleMatrix = [
'mat4 scaleMatrix( vec3 n, float s ) {',
    'return mat4(',
        '1.0 + ( s - 1.0 ) * n.x * n.x,       ( s - 1.0 ) * n.x * n.y,       ( s - 1.0 ) * n.x * n.z, 0.0,',
              '( s - 1.0 ) * n.y * n.x, 1.0 + ( s - 1.0 ) * n.y * n.y,       ( s - 1.0 ) * n.y * n.z, 0.0,',
              '( s - 1.0 ) * n.z * n.x,       ( s - 1.0 ) * n.z * n.y, 1.0 + ( s - 1.0 ) * n.z * n.z, 0.0,',
                                  '0.0,                           0.0,                           0.0, 1.0',
    ');',
'}'
].join( '\n' );

/*
intersection()
Функция возвращает vec3 точку пересечения прямой, проходящей вдоль вектора r через точку o,
и плоскости с нормалью n и произвольной точкой v, лежащей на этой плоскости.
*/
var intersection = [
'vec3 intersection( vec3 v, vec3 n, vec3 r, vec3 o ) {',		
    'return o + r * dot( n, v - o ) / dot( n, r );',
'}'
].join( '\n' );

/*
distPointToPlane()
Функция возвращает float расстояние от точки до плоскости с нормалью n и произвольной точкой v, лежащей на этой плоскости.
*/
var distPointToPlane = [
'float distPointToPlane( vec3 v, vec3 n, vec3 p ) {',		
    'return dot( n, p - v );',
'}'
].join( '\n' );

/*
inRect()
Функция возвращает float значение, равное 1.0, если точка p, лежащая в плоскости, образованной нормалями n1 и n2,
выходящими из точки v, находится внутри прямоугольника с шириной w и высотой h, в котором точка v является вершиной,
и значение, равное 0.0, в обратном случае.
*/
var inRect = [
'float inRect( vec3 n1, vec3 n2, vec3 p, vec3 v, float w, float h ) {',
	'vec3 pv = p - v;',
    'return step( 1.0, w / dot( n1, pv ) ) * step( 1.0, h / dot( n2, pv ) );',
'}'
].join( '\n' );

/* ДОРАБОТАТЬ!
inTriangle()
Функция возвращает float значение, равное 1.0, если точка p, лежащая в плоскости, образованной точками v1, v2 и v3,
находится внутри треугольника с вершинами v1, v2 и v3, и значение, равное 0.0, в обратном случае.
*/
var inTriangle = [
'float inTriangle( vec3 v1, vec3 v2, vec3 v3, vec3 p ) {',
	'return float( dot( v1 - v2, v1 - v3 ) < dot( p - v2, p - v3 ) ) *',
	       'float( dot( v2 - v1, v2 - v3 ) < dot( p - v1, p - v3 ) ) *',
	       'float( dot( v3 - v1, v3 - v2 ) < dot( p - v1, p - v2 ) );',
'}'
].join( '\n' );