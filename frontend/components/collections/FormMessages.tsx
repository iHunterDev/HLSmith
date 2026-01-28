type FormMessagesProps = {
  success?: string | null;
  error?: string | null;
};

export default function FormMessages({ success, error }: FormMessagesProps) {
  return (
    <>
      {success && <div className="text-sm text-green-700">{success}</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
    </>
  );
}
