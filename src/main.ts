document.title = 'Latency Cathedral';

const canvas = document.getElementById('cathedral') as HTMLCanvasElement | null;
if (canvas) {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ccc';
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Latency Cathedral', canvas.width / 2, canvas.height / 2);
  }
}
