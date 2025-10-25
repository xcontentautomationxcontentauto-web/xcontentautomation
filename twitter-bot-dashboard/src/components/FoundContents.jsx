import { httpsCallable } from 'firebase/functions';

// Add this function to your FoundContents component
const startRealMonitoring = async () => {
  if (!user) {
    setStatus('❌ Please sign in to start monitoring');
    return;
  }

  setLoading(true);
  setStatus('🚀 Starting real monitoring of X accounts and news sources...');

  try {
    const startMonitoringFunction = httpsCallable(functions, 'startMonitoring');
    const result = await startMonitoringFunction();
    
    setStatus('✅ Real monitoring started! Checking for content from your X accounts and news sources...');
    
    // Wait a bit and refresh to see if new content appears
    setTimeout(() => {
      subscribeToFoundContents();
    }, 5000);
    
  } catch (error) {
    console.error('Error starting monitoring:', error);
    setStatus('❌ Error starting monitoring: ' + error.message);
  } finally {
    setLoading(false);
  }
};

// Add this button to your JSX (in the button group):
<button 
  className="btn btn-success"
  onClick={startRealMonitoring}
  disabled={loading || !user}
>
  🚀 Start Real Monitoring
</button>