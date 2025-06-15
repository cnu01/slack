import { MessageSquare } from 'lucide-react';

function ThreadsView() {
  return (
    <div className="flex-1 flex items-center justify-center bg-white h-full">
      <div className="text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2 text-gray-700">No threads yet</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          When someone replies to one of your messages, you'll see it here.
        </p>
      </div>
    </div>
  );
}

export default ThreadsView;
