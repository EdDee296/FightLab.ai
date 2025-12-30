import { usePose } from '../hooks/usePose';

/**
 * Main component for pose visualization
 * Renders video feed with canvas overlay for pose landmarks
 */
export function PoseVisualization() {
  const { videoRef, canvasRef, isLoading, error, isPoseDetected } = usePose();

  // No dynamic resizing needed - using fixed dimensions

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">
          MediaPipe Pose Debug Visualization
        </h1>
        <div className="text-sm text-gray-300">
          {isLoading && <span>Loading camera and pose model...</span>}
          {error && <span className="text-red-400">{error}</span>}
          {!isLoading && !error && (
            <span className={isPoseDetected ? 'text-green-400' : 'text-yellow-400'}>
              {isPoseDetected ? '✓ Pose Detected' : '⚠ No Pose Detected'}
            </span>
          )}
        </div>
      </div>

      <div style={{ position: 'relative', display: 'inline-block' }}>
        <video
          ref={videoRef}
          style={{ 
            display: 'block',
            width: '640px',
            height: '480px'
          }}
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '640px',
            height: '480px',
            pointerEvents: 'none'
          }}
        />
      </div>

      <div className="mt-4 text-xs text-gray-400 text-center max-w-2xl">
        <p>Red dots = labeled key joints | Blue dots = all other landmarks</p>
        <p>Green lines = skeleton connections | Yellow text = joint coordinates (normalized 0-1)</p>
      </div>
    </div>
  );
}
