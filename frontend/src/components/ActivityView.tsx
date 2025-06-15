import { Activity, Bell, AtSign, MessageCircle } from 'lucide-react';

function ActivityView() {
  return (
    <div className="flex-1 flex items-center justify-center bg-white h-full">
      <div className="text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Activity className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2 text-gray-700">No recent activity</h3>
        <p className="text-gray-500 max-w-md mx-auto mb-6">
          When you have mentions, reactions, and other activity, you'll see them here.
        </p>

        {/* Activity Categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-md">
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <AtSign className="w-8 h-8 mx-auto mb-2 text-purple-500" />
            <h4 className="font-medium text-gray-900">Mentions</h4>
            <p className="text-sm text-gray-600">Messages that mention you</p>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <h4 className="font-medium text-gray-900">Reactions</h4>
            <p className="text-sm text-gray-600">Reactions to your messages</p>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <Bell className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <h4 className="font-medium text-gray-900">Updates</h4>
            <p className="text-sm text-gray-600">Channel and workspace updates</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ActivityView;
