import { useOpenAccount } from "@/features/accounts/hooks/use-open-account";

type AccountColumnProps = {
  account: string;
  accountId: string;
};

export const AccountColumn = ({ account, accountId }: AccountColumnProps) => {
  const { onOpen: onOpenAccount } = useOpenAccount();

  const onClick = () => onOpenAccount(accountId);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 cursor-pointer items-center text-left hover:underline focus-visible:outline-none"
      aria-label={`Editar cuenta ${account}`}
    >
      {account}
    </button>
  );
};
