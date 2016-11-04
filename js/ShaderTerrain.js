THREE.ShaderTerrain = { 
	'terrain' : {
		uniforms: THREE.UniformsUtils.merge( [

				THREE.UniformsLib[ "fog" ],
				THREE.UniformsLib[ "lights" ],

				{
					"heightmapSampler": {value: null},
					"groundSampler": { value: null },
					"sandSampler": { value: null },
					"rockSampler": { value: null },
					"snowSampler": { value: null },
					"grassSampler": { value: null },
					"blendSampler": { value: null },

					"vLimits": { value: new THREE.Vector4( 0, 0, 0, 0 ) },
					"vLightPosition": { value: new THREE.Vector3( 0, 0, 0) },
				}

			] ),
		fragmentShader: [
				"uniform vec4 vLimits;",
				"uniform vec3 vLightPosition;",

				// Ground
				"uniform sampler2D groundSampler;",

				// Sand
				"uniform sampler2D sandSampler;",

				// Rock
				"uniform sampler2D rockSampler;",

				// Snow
				"uniform sampler2D snowSampler;",

				// Snow
				"uniform sampler2D grassSampler;",

				// Snow
				"uniform sampler2D blendSampler;",

				// Lights
				"varying vec3 vPositionW;",
				"varying vec3 vNormalW;",

				"varying vec2 UV;",

				"void main(void) {",

					// Light
					"vec3 lightVectorW = normalize(vLightPosition - vPositionW);",

					// diffuse
					"float ndl = max(0., dot(vNormalW, lightVectorW));",

					// Final composition
					"vec3 finalColor = vec3(0., 0., 0.);",
					"vec2 uvOffset = vec2(1.0 / 512.0, 1.0 / 512.0);",

					"if (vPositionW.y <= vLimits.x)",
					"{",
						"float lowLimit = vLimits.x - 2.;",
						"float gradient = clamp((vPositionW.y - lowLimit) / (vLimits.x - lowLimit), 0., 1.);",

						"float blend = texture2D(blendSampler, UV).r;",
						"vec3 groundColor = texture2D(groundSampler, UV).rgb;",

						"finalColor = ndl * (texture2D(sandSampler, UV).rgb * (1.0 - gradient) + gradient * groundColor);",
					"}",
					"else if (vPositionW.y > vLimits.x && vPositionW.y <= vLimits.y)",
					"{",
						"float lowLimit = vLimits.y - 5.;",
						"float gradient = clamp((vPositionW.y - lowLimit) / (vLimits.y - lowLimit), 0., 1.);",

						"float blend = texture2D(blendSampler, UV).r;",
						"vec3 currentColor = texture2D(groundSampler, UV).rgb;",

						"finalColor = ndl * (currentColor * (1.0 - gradient) + gradient * texture2D(grassSampler, UV + uvOffset).rgb);",
					"}",
					"else if (vPositionW.y > vLimits.y && vPositionW.y <= vLimits.z)",
					"{",
						"float lowLimit = vLimits.z - 5.;",
						"float gradient = clamp((vPositionW.y - lowLimit) / (vLimits.z - lowLimit), 0., 1.);",

						"float blend = texture2D(blendSampler, UV).r;",
						"vec3 currentColor = texture2D(grassSampler, UV + uvOffset).rgb;",

						"finalColor = ndl * (currentColor * (1.0 - gradient) + gradient * texture2D(rockSampler, UV + uvOffset).rgb);",
					"}",
					"else if (vPositionW.y > vLimits.z && vPositionW.y <= vLimits.w)",
					"{",
						"float lowLimit = vLimits.w - 5.;",
						"float gradient = clamp((vPositionW.y - lowLimit) / (vLimits.w - lowLimit), 0., 1.);",

						"finalColor = ndl * (texture2D(rockSampler, UV + uvOffset).rgb * (1.0 - gradient)) + gradient *(ndl * texture2D(snowSampler, UV).rgb);",
					"}",
					"else",
					"{",
						"finalColor = texture2D(snowSampler, UV).rgb * ndl;",
					"}",

					"gl_FragColor = vec4(finalColor, 1.);",
					//"gl_FragColor = vec4(texture2D(rockSampler, UV).rgb, 1.);",
				"}"

				].join( "\n" ),

		vertexShader: [
				// Uniforms
				"uniform mat4 world;",
				"uniform mat4 worldViewProjection;",
				"uniform sampler2D heightmapSampler;",
				// Normal
				"varying vec3 vPositionW;",
				"varying vec3 vNormalW;",
				"varying vec2 UV;",

				"void main(void) { ",
					"float height = texture2D(heightmapSampler, uv).x;",
					"vec3 newPosition = position + 20.0 * normal * height;",
					"vec4 mvPosition = modelViewMatrix * vec4( newPosition, 1.0 );",
					"gl_Position = projectionMatrix * mvPosition;",
					
					"vec4 worldPos = modelMatrix * vec4(newPosition, 1.0);",
					"vPositionW = vec3(worldPos);",
					"vNormalW = normalize(vec3(modelMatrix * vec4(normal, 0.0)));",
					"UV = uv;",
				"}"
				].join( "\n" )
	}
}