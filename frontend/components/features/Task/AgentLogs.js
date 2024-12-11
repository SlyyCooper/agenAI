import { MessageCircle } from 'lucide-react';

export default function AgentLogs({ agentLogs }) {
  const renderAgentLogs = (agentLogs) => {
    return agentLogs && agentLogs.map((agentLog, index) => (
      <div key={index} className="mb-4 p-4 bg-white rounded-lg shadow-md">
        <p className="text-gray-700">{agentLog.output}</p>
      </div>
    ));
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-5 h-5 text-blue-500" />
        <h3 className="text-xl font-bold text-gray-800">Agent Output</h3>
      </div>
      <div id="output" className="space-y-4">
        {agentLogs && agentLogs.length > 0 ? (
          renderAgentLogs(agentLogs)
        ) : (
          <div className="flex flex-col gap-2">
            <div className="h-4 w-full animate-pulse rounded-md bg-gray-200" />
            <div className="h-4 w-3/4 animate-pulse rounded-md bg-gray-200" />
          </div>
        )}
      </div>
    </div>
  );
}
