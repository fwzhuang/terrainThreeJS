function Water( width, height, wSegments, hSegments, position, rotation) { 
	this.getIntersection = [
	    'vec3 getIntersection( vec3 v, vec3 n, vec3 r, vec3 o ) {',		
			'return o + r * dot( n, v - o ) / dot( n, r );',
		'}'
	].join('\n');

	this.inRect = [	
		'float inRect( vec3 n1, vec3 n2, vec3 p, vec3 v, float w, float h ) {',
		    'vec3 pv = p - v;',
			'return step( 1.0, w / dot( n1, pv ) ) * step( 1.0, h / dot( n2, pv ) );',
		'}'
	].join('\n');
	
	this.getCenterCoords = [	
		'vec2 getCenterCoords( vec3 n1, vec3 n2, vec3 p, vec3 v ) {',
		    'vec3 pv = p - v;',
			'return vec2( dot( n1, pv ), dot( n2, pv ) );',
		'}'
	].join('\n');

	this.inRectLight = [
		'float inRectLight( vec3 n1, vec3 n2, vec3 p, vec3 v, float w, float h ) {',
		    'vec3 pv = p - v;',
			'return smoothstep( 0.98, 1.02, w / abs( dot( n1, pv ) ) ) * smoothstep( 0.98, 1.02, h / abs( dot( n2, pv ) ) );',
		'}'
	].join('\n');	
	
	this.getWallLight = [
		'vec4 getWallLight( vec3 v, vec3 n[ 3 ], vec3 p, vec3 n_, vec4 c, sampler2D caustics ) {',
		    'vec3 lightDir = normalize( lightPos - p ), s = getIntersection( v, n[ 0 ], lightDir, p );',
			'vec4 diffuse = vec4( max( dot( n_, lightDir ), 0.0 ) ) * 0.5, specular = vec4( pow( max( dot( normalize( cameraPosition - p ), reflect( - lightDir, n_ ) ), 0.0 ), 32.0 ) ) * 0.2;',						 					 	
			'float light = inRectLight( n[ 1 ], n[ 2 ], s, v, 50.0, 50.0 );',
            'return ( vec4( 0.5 ) + light * 5.0 * texture2D( caustics, getRectCoord( n[ 1 ], n[ 2 ], s, ( sceneMatrix * vec4( - 50.0, 25.0, - 50.0, 1.0 ) ).xyz ) ) * ( diffuse + specular ) ) * c;',
		'}'
	].join('\n');
	
	this.tex = [
		'vec4 tex( vec3 n1, vec3 n2, vec3 p, vec3 v, float w, float h ) {',
		    'vec3 pv = p - v;',
			'float d1 = dot( n1, pv ), d2 = dot( n2, pv );',
			'return ( w / d1 > 1.0 ) && ( h / d2 > 1.0 ) ? texture2D( tile, 0.01 * vec2( d1, d2 ) ) : vec4( 0.0 );',
			// 'return texture2D( tile, 0.01 * vec2( d1, d2 ) );',
		'}'
	].join('\n');
	
	this.getRectCoord = [
		'vec2 getRectCoord( vec3 n1, vec3 n2, vec3 p, vec3 v ) {',
		    'vec3 pv = p - v;',
			'return vec2( 0.01 * dot( n1, pv ), 1.0 - 0.01 * dot( n2, pv ) );',
		'}'
	].join('\n');

	this.n = [
        'vec3 n[ 3 ];',
		'n[ 0 ] = ( sceneMatrix * vec4( 0.0, 1.0, 0.0, 1.0 ) ).xyz;',
		'n[ 1 ] = ( sceneMatrix * vec4( 1.0, 0.0, 0.0, 1.0 ) ).xyz;',
		'n[ 2 ] = ( sceneMatrix * vec4( 0.0, 0.0, 1.0, 1.0 ) ).xyz;'
	].join('\n');
	
	this.v = [
        'vec3 v[ 3 ];',
		// 'v[ 0 ] = ( sceneMatrix * vec4( - 1.0, - 1.0, - 1.0, 1.0 ) ).xyz;',
		// 'v[ 1 ] = ( sceneMatrix * vec4( - 1.0,   1.0,   1.0, 1.0 ) ).xyz;',
		// 'v[ 2 ] = ( sceneMatrix * vec4( - 1.0,   1.0, - 1.0, 1.0 ) ).xyz;',
		'v[ 0 ] = ( sceneMatrix * vec4( - 50.0, - 0.0, - 50.0, 1.0 ) ).xyz;',
		'v[ 1 ] = ( sceneMatrix * vec4( - 50.0,   0.0,   50.0, 1.0 ) ).xyz;',
		'v[ 2 ] = ( sceneMatrix * vec4( - 50.0,   0.0, - 50.0, 1.0 ) ).xyz;',
	].join('\n');
	
	this.tile = tex( 'textures/terrain/sand.jpg' );  
	this.tile.anisotropy = 16;

    this.geometry = new THREE.PlaneGeometry( width, height, wSegments, hSegments );
		
	this.changeData = 1;
	
	this.data = [ FBO( 200, 200, { type: THREE.FloatType } ), FBO( 200, 200, { type: THREE.FloatType } ) ];
	
	this.caustics = FBO( 1024, 1024 );
	this.caustics.texture.wrapS = THREE.RepeatWrapping; 
	this.caustics.texture.wrapT = THREE.RepeatWrapping;

	this.new = false;
	
	this.center = vec2( 0, 0 );
	
	var dMat = this.dataMaterial = new THREE.ShaderMaterial( {
		
		uniforms: {
			'dataMap': { type: 't' },
			'new': { type: 'f', value: 0.0 },
			'center': { type: 'v2', value: this.center }
		},
		
		vertexShader: [
            'varying vec2 coords;',			
            'void main() {',
                'gl_Position = vec4( position, 1.0 );',
				'coords = position.xy * 0.5 + 0.5;',
            '}'
	    ].join('\n'),
	
		fragmentShader: [
		    'uniform sampler2D dataMap;',
			'uniform float new;',
			'uniform vec2 center;',
			'varying vec2 coords;',
            'void main() {',
			    'vec4 data = texture2D( dataMap, coords );',
			    'float height = data.r;',
			    'float average = ( texture2D( dataMap, coords + vec2(   0.01,   0.00 ) ).r +',
				                  'texture2D( dataMap, coords + vec2(   0.00, - 0.01 ) ).r +',
							      'texture2D( dataMap, coords + vec2( - 0.01,   0.00 ) ).r +',
							      'texture2D( dataMap, coords + vec2(   0.00,   0.01 ) ).r ) * 0.25;',
     		    'float velocity = data.g + ( average - height ) * 2.0;',
				'height += velocity;',
				'vec3 n = vec3( - 1.0, - 1.0, texture2D( dataMap, coords + vec2( - 0.01, - 0.01 ) ).r ) - vec3( 1.0, 1.0, texture2D( dataMap, coords + vec2( 0.01, 0.01 ) ).r );',
				'vec3 n_ = vec3( - 1.0, 1.0, texture2D( dataMap, coords + vec2( - 0.01, 0.01 ) ).r ) - vec3( 1.0, - 1.0, texture2D( dataMap, coords + vec2( 0.01, - 0.01 ) ).r );',	
			    'vec3 normal = normalize( cross( n, n_ ) );',
				'gl_FragColor = vec4( height * 0.995 + ( new == 1.0 ? 0.5 - cos( max( 0.0, 1.0 - length( 0.01 * center - coords ) / 0.03 ) * 3.141592653589793 ) * 0.5 : 0.0 ), velocity, normal.x, normal.y );',
            '}'
	    ].join('\n')	    
		
	} );
	
	var cMat = this.causticsMaterial = new THREE.ShaderMaterial( {
		
		uniforms: {
			'dataMap': { type: 't' },
			'lightPos': { type: 'v3' },
			'sceneMatrix': { type: 'm4' }
		},
		
		vertexShader: [
		    'uniform sampler2D dataMap;',
			'uniform mat4 sceneMatrix;',
			'uniform vec3 lightPos;',
			'varying vec3 nP;',
			'varying vec3 oP;',
            'void main() {',
		        this.n,
                'vec4 data = texture2D( dataMap, 0.49 - position.xy * 0.01 );',
				'vec3 o = vec3( position.xy, data.r - 3.0 ),',
				     'vp = lightPos - ( sceneMatrix * vec4( 0.0, 25.0, 0.0, 1.0 ) ).xyz,',
				     'lightPos_ = vec3( dot( n[ 1 ], vp ), - dot( n[ 2 ], vp ), dot( n[ 0 ], vp ) ),',
                     'l = normalize( lightPos_ - o ),',
                     'r = refract( - l, vec3( data.b, data.a, 1.0 ), 0.9 ),',
                     'd = ( sign( r ) * 50.0 - o ) / r;',
                'float dMin = min( d.x, min( d.y, d.z ) );',
                'nP = o + r * dMin;',
				'oP = o + refract( - l, normal, 0.9 ) * dMin;',
				'gl_Position = vec4( nP - ( nP - lightPos_ ) * nP.z / ( nP.z - lightPos_.z ), 50.0 );',
            '}'
	    ].join('\n'),
	
		fragmentShader: [
		    '#extension GL_OES_standard_derivatives : enable',
		    'varying vec3 oP;',
			'varying vec3 nP;',
            'void main() {',
			    'float old = length( dFdx( oP ) ) * length( dFdy( oP ) );',
                'float new = length( dFdx( nP ) ) * length( dFdy( nP ) );',
				'gl_FragColor = vec4( old / new * 0.2 );',
            '}'
	    ].join('\n')
 		
	} );

    var mat = this.material = new THREE.ShaderMaterial( {
		
        uniforms: {
			'color': { type: 'c', value: col( 0xb1dcfc ) },
			'dataMap': { type: 't' },
			'caustics': { type: 't', value: this.caustics.texture },
			'lightPos': { type: 'v3', value: worldPos( camera ) },
		    'sceneMatrix': { type: 'm4' },
			'tile': { type: 't', value: this.tile }
        },
		
        vertexShader: [
		    'uniform sampler2D dataMap;',
			'varying vec3 waterPoint;',
			'varying vec3 vertexNormal;',
            'void main() {',
				'vec4 data = texture2D( dataMap, 0.49 - position.xy * 0.01 );',
				'waterPoint = ( modelMatrix * vec4( vec3( position.xy, data.r ), 1.0 ) ).xyz;',
			    'vertexNormal = normalize( ( modelMatrix * vec4( data.b, data.a, 1.0, 0.1 ) ).xyz );',					
				'gl_Position = projectionMatrix * viewMatrix * vec4( waterPoint, 1.0 );',			
		    '}'
        ].join('\n'),
		
        fragmentShader: [
			'uniform sampler2D tile;',
			'uniform sampler2D caustics;',
			'uniform mat4 sceneMatrix;',
			'uniform vec3 lightPos;',
			'uniform vec3 color;',
			'varying vec3 waterPoint;',
			'varying vec3 vertexNormal;',
			this.getIntersection,
            this.getRectCoord,
			this.inRectLight,
			this.getWallLight,
            this.tex,
			'vec4 getTex( vec3 v[ 3 ], vec3 n[ 3 ], vec3 r, vec3 o, vec4 c ) {',
			    'float d0 = dot( n[ 0 ], r ), d1, sd1, d2, sd2;',
			    'vec3 s = o - r * ( dot( n[ 0 ], o ) + 25.0 ) / d0;',
                'vec4 t = tex( n[ 1 ], n[ 2 ], s, v[ 0 ], 100.0, 100.0 );',
                'if ( d0 * t.a < 0.0 ) t *= getWallLight( 25.0 * n[ 0 ], n, s, n[ 0 ], c, caustics );',
                'else if ( ( t = tex( - n[ 2 ], - n[ 0 ], s = o - r * ( dot( n[ 1 ], o ) - ( sd1 = sign( d1 = dot( n[ 1 ], r ) ) ) * 50.0 ) / d1, v[ 1 ], 100.0, 50.0 ) ).a > 0.0 )',
                    't *= getWallLight( 25.0 * n[ 0 ], n, s, - n[ 1 ] * sd1, c, caustics );',
                'else if ( ( t = tex( n[ 1 ], - n[ 0 ], s = o - r * ( dot( n[ 2 ], o ) - ( sd2 = sign( d2 = dot( n[ 2 ], r ) ) ) * 50.0 ) / d2, v[ 2 ], 100.0, 50.0 ) ).a > 0.0 )',
                    't *= getWallLight( 25.0 * n[ 0 ], n, s, - n[ 2 ] * sd2, c, caustics );',
                'return t;',
			'}',
            'void main() {',
                this.n,
                this.v,	        
			    'vec3 source = normalize( cameraPosition - waterPoint ), lightDir = normalize( lightPos - waterPoint ),',
			         'ray = dot( source, n[ 0 ] ) < 0.0 ? refract( - source, - vertexNormal, 1.1 ) : refract( - source, vertexNormal, 0.9 ),',
			         'ray_ = reflect( - source, vertexNormal );',
			    'float diffuse = max( dot( vertexNormal, lightDir ), 0.5 ), specular = pow( max( dot( source, reflect( - lightDir, vertexNormal ) ), 0.0 ), 512.0 );',
				'vec4 light = vec4( 0.6 ) + vec4( diffuse ) + vec4( 3.0 * specular );',	
			    'vec4 outColor = mix( getTex( v, n, ray, waterPoint, vec4( color * color * 1.1, 1.0 ) ), getTex( v, n, ray_, waterPoint, vec4( color, 1.0 ) ), 0.3 ) * light;',
			    'gl_FragColor = outColor;',
			'}'
        ].join('\n'),
	
		side: THREE.DoubleSide
		
    } );

    this.mesh = new THREE.Mesh( this.geometry, this.material );
	this.mesh.position.copy( position );
	this.mesh.rotation.set( rotation.x, rotation.y, rotation.z );
	
    this.update = function() {
		mat.uniforms.dataMap.value = cMat.uniforms.dataMap.value = dMat.uniforms.dataMap.value = this.data[ this.changeData ].texture;
		mat.uniforms.sceneMatrix.value = cMat.uniforms.sceneMatrix.value = scene.matrix;
		mat.uniforms.lightPos.value = cMat.uniforms.lightPos.value = worldPos( camera );
		dMat.uniforms.new.value = this.new ? 1 : 0;
		this.new = false;
		dMat.uniforms.center.value = this.center;
	    this.mesh.material = dMat;
	    renderer.render( this.mesh, camera, this.data[ this.changeData = 1 - this.changeData ], true );
	    this.mesh.material = this.causticsMaterial;
	    renderer.setClearColor( 0x141414 );
	    renderer.render( this.mesh, camera, this.caustics, true );
	    renderer.setClearColor( 0x000000 );
	    this.mesh.material = mat;		
        mat.uniforms.caustics.value = this.caustics.texture;		
		
    };
	
	this.drop = function( x, y ) {
	    
		this.new = true;
		this.center = vec2( x, y );
		
	};

};