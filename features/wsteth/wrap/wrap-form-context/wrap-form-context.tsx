import invariant from 'tiny-invariant';
import { useMemo, createContext, useContext } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { useWstethBySteth } from 'shared/hooks';
import { useWrapTxApprove } from '../hooks/use-wrap-tx-approve';
import { useWrapFormNetworkData } from '../hooks/use-wrap-form-network-data';
import { useWrapFormProcessor } from '../hooks/use-wrap-form-processing';
import { useWrapFormValidationContext } from '../hooks/use-wrap-form-validation-context';

import { FormControllerContext } from 'features/wsteth/shared/form-controller/form-controller-context';

import {
  WrapFormDataContextValueType,
  WrapFormInputType,
  WrapFormValidationContext,
} from './types';
import { WrapFormValidationResolver } from './wrap-form-validators';
import { TOKENS_TO_WRAP } from 'features/wsteth/shared/types';
import { Zero } from '@ethersproject/constants';

//
// Data context
//
const WrapFormDataContext = createContext<WrapFormDataContextValueType | null>(
  null,
);
WrapFormDataContext.displayName = 'WrapFormDataContext';

export const useWrapFormData = () => {
  const value = useContext(WrapFormDataContext);
  invariant(value, 'useWrapFormData was used outside the provider');
  return value;
};

//
// Data provider
//
export const WrapFormProvider: React.FC = ({ children }) => {
  const networkData = useWrapFormNetworkData();
  const validationContextPromise = useWrapFormValidationContext({
    networkData,
  });

  const formObject = useForm<
    WrapFormInputType,
    Promise<WrapFormValidationContext>
  >({
    defaultValues: {
      amount: null,
      token: TOKENS_TO_WRAP.STETH,
    },
    context: validationContextPromise,
    criteriaMode: 'firstError',
    mode: 'onChange',
    resolver: WrapFormValidationResolver,
  });

  const { watch } = formObject;
  const [token, amount] = watch(['token', 'amount']);

  const approvalData = useWrapTxApprove({ amount: amount ?? Zero, token });
  const processWrapFormFlow = useWrapFormProcessor({
    approvalData,
    onConfirm: networkData.revalidateWrapFormData,
  });

  const isSteth = token === TOKENS_TO_WRAP.STETH;

  const willReceiveWsteth = useWstethBySteth(
    isSteth && approvalData.isApprovalNeededBeforeWrap ? Zero : amount ?? Zero,
  );

  const value = useMemo(
    (): WrapFormDataContextValueType => ({
      ...networkData,
      ...approvalData,
      isSteth,
      maxAmount: isSteth
        ? networkData.maxAmountStETH
        : networkData.maxAmountETH,
      wrapGasLimit: isSteth
        ? networkData.gasLimitStETH
        : networkData.gasLimitETH,
      willReceiveWsteth,
      onSubmit: processWrapFormFlow,
    }),
    [
      networkData,
      approvalData,
      isSteth,
      willReceiveWsteth,
      processWrapFormFlow,
    ],
  );

  return (
    <FormProvider {...formObject}>
      <WrapFormDataContext.Provider value={value}>
        <FormControllerContext.Provider value={value}>
          {children}
        </FormControllerContext.Provider>
      </WrapFormDataContext.Provider>
    </FormProvider>
  );
};
