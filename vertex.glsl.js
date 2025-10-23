export default `#version 300 es

in vec3 position;
out vec4 vColor;
uniform mat4 modelview;
uniform mat4 projection;

void main() {
  
  float height = (position.y + 16.0) / 64.0; 
  height = clamp(height, 0.0, 1.0);
  vColor = vec4(0.0, height, 1.0 - height, 1.0);
  
  gl_Position = projection * modelview * vec4(position.xyz, 1);
}
`;