import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { api } from '../lib/api';
import type { Cluster } from '../lib/api';

const providers = [
  { value: 'eks', label: 'Amazon EKS', color: 'border-orange-400/30 hover:border-orange-400' },
  { value: 'gke', label: 'Google GKE', color: 'border-blue-400/30 hover:border-blue-400' },
  { value: 'aks', label: 'Azure AKS', color: 'border-sky-400/30 hover:border-sky-400' },
  { value: 'k3s', label: 'K3s', color: 'border-green-400/30 hover:border-green-400' },
  { value: 'openshift', label: 'OpenShift', color: 'border-red-400/30 hover:border-red-400' },
  { value: 'other', label: 'Other', color: 'border-gray-400/30 hover:border-gray-400' },
];

export default function NewCluster() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const c = await api.createCluster(name, provider);
      setCluster(c);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to create cluster');
    } finally {
      setLoading(false);
    }
  };

  const copyApiKey = () => {
    if (cluster) {
      navigator.clipboard.writeText(cluster.api_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const helmCommand = cluster
    ? `helm install infradar-agent ./deploy/helm \\
  --set config.apiUrl=YOUR_API_URL \\
  --set config.apiKey=${cluster.api_key} \\
  --namespace infradar --create-namespace`
    : '';

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/clusters')}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Clusters
      </button>

      {step === 1 ? (
        <>
          <h1 className="text-2xl font-bold mb-2">Add Cluster</h1>
          <p className="text-gray-400 mb-8">Connect a Kubernetes cluster to Infradar</p>

          <form onSubmit={handleCreate} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Cluster Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-surface-800 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="e.g. production-us-east"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Provider</label>
              <div className="grid grid-cols-3 gap-3">
                {providers.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setProvider(p.value)}
                    className={`border rounded-lg p-4 text-sm font-medium transition-colors text-center ${
                      provider === p.value
                        ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400'
                        : `border-white/10 text-gray-300 ${p.color}`
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !name || !provider}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Cluster'}
            </button>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-2">Cluster Created</h1>
          <p className="text-gray-400 mb-8">Install the Infradar agent on your cluster</p>

          <div className="space-y-6">
            <div className="bg-surface-800 border border-white/5 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">API Key</h3>
                <button
                  onClick={copyApiKey}
                  className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-yellow-400 mb-3">Save this key now. You won't be able to see it again.</p>
              <code className="block bg-navy-950 rounded-lg p-4 text-sm text-cyan-400 break-all font-mono">
                {cluster?.api_key}
              </code>
            </div>

            <div className="bg-surface-800 border border-white/5 rounded-xl p-6">
              <h3 className="font-semibold mb-3">Install Agent via Helm</h3>
              <pre className="bg-navy-950 rounded-lg p-4 text-sm text-gray-300 overflow-x-auto font-mono">
                {helmCommand}
              </pre>
            </div>

            <button
              onClick={() => navigate(`/clusters/${cluster?.id}`)}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-semibold py-3 rounded-lg transition-colors"
            >
              Go to Cluster
            </button>
          </div>
        </>
      )}
    </div>
  );
}
