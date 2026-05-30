import { CollabEditor } from '../../components/CollabEditor';

export default function CollabPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Collaborative Editor</h1>
      <CollabEditor roomId="default-room" />
    </div>
  );
}