import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBilling } from '../../hooks/useBilling';
import {
  CreditCardIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const BillingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    plans, 
    subscription, 
    usage, 
    loading, 
    createCheckoutSession, 
    createPortalSession, 
    cancelSubscription 
  } = useBilling();

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (subscription?.plan) {
      setSelectedPlan(subscription.plan.id);
    }
  }, [subscription]);

  const handleSubscribe = async (planId) => {
    setIsProcessing(true);
    try {
      const successUrl = `${window.location.origin}/billing?success=true`;
      const cancelUrl = `${window.location.origin}/billing?canceled=true`;
      
      const result = await createCheckoutSession(planId, successUrl, cancelUrl);
      
      if (result.success) {
        window.location.href = result.data.url;
      }
    } catch (error) {
      toast.error('Failed to create checkout session');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManageBilling = async () => {
    setIsProcessing(true);
    try {
      const returnUrl = `${window.location.origin}/billing`;
      const result = await createPortalSession(returnUrl);
      
      if (result.success) {
        window.location.href = result.data.url;
      }
    } catch (error) {
      toast.error('Failed to open billing portal');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSubscription = async (immediately = false) => {
    setIsProcessing(true);
    try {
      const result = await cancelSubscription(immediately, 'User requested cancellation');
      
      if (result.success) {
        toast.success(result.message);
        setShowCancelModal(false);
        // Refresh subscription data
        window.location.reload();
      }
    } catch (error) {
      toast.error('Failed to cancel subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whatsapp-500"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Billing & Plans</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Current Subscription */}
      {subscription && (
        <div className="card mb-8">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Current Subscription</h3>
              <span className={`status-indicator ${
                subscription.status === 'ACTIVE' ? 'status-success' : 'status-warning'
              }`}>
                {subscription.status}
              </span>
            </div>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-500">Plan</p>
                <p className="text-lg font-semibold text-gray-900">
                  {subscription.plan?.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Price</p>
                <p className="text-lg font-semibold text-gray-900">
                  ${subscription.plan?.price}/{subscription.plan?.interval}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Next Billing</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="text-lg font-semibold text-gray-900">
                  {subscription.cancelAtPeriodEnd ? 'Cancels at period end' : 'Active'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                onClick={handleManageBilling}
                disabled={isProcessing}
                className="btn btn-outline"
              >
                <CreditCardIcon className="h-4 w-4 mr-2" />
                Manage Billing
              </button>
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={isProcessing}
                className="btn btn-secondary"
              >
                Cancel Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Usage Statistics */}
      {usage && (
        <div className="card mb-8">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Usage This Month</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Messages</span>
                  <span className="text-sm text-gray-500">
                    {usage.usage.messages.used} / {usage.usage.messages.limit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      usage.usage.messages.percentage > 80
                        ? 'bg-red-500'
                        : usage.usage.messages.percentage > 60
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(usage.usage.messages.percentage, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Contacts</span>
                  <span className="text-sm text-gray-500">
                    {usage.usage.contacts.used} / {usage.usage.contacts.limit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      usage.usage.contacts.percentage > 80
                        ? 'bg-red-500'
                        : usage.usage.contacts.percentage > 60
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(usage.usage.contacts.percentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans?.map((plan) => (
            <div
              key={plan.id}
              className={`card relative ${
                selectedPlan === plan.id ? 'ring-2 ring-whatsapp-500' : ''
              }`}
            >
              {plan.name === 'Pro' && (
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2">
                  <span className="bg-whatsapp-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                    Popular
                  </span>
                </div>
              )}

              <div className="card-header text-center">
                <h3 className="text-lg font-medium text-gray-900">{plan.name}</h3>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  ${plan.price}
                  <span className="text-sm font-normal text-gray-500">
                    /{plan.interval}
                  </span>
                </p>
              </div>

              <div className="card-body">
                <ul className="space-y-3">
                  {plan.features?.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  {subscription?.plan?.id === plan.id ? (
                    <button
                      onClick={handleManageBilling}
                      disabled={isProcessing}
                      className="w-full btn btn-outline"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={isProcessing}
                      className="w-full btn btn-primary"
                    >
                      {isProcessing ? (
                        <ArrowPathIcon className="animate-spin h-4 w-4 mr-2" />
                      ) : (
                        'Subscribe'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Frequently Asked Questions</h3>
        </div>
        <div className="card-body">
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Can I change my plan anytime?
              </h4>
              <p className="text-sm text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. Changes will be prorated
                and reflected in your next billing cycle.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                What happens if I exceed my limits?
              </h4>
              <p className="text-sm text-gray-600">
                You'll be notified when you approach your limits. Additional messages will be
                charged at $0.01 per message, or you can upgrade to a higher plan.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Can I cancel my subscription?
              </h4>
              <p className="text-sm text-gray-600">
                Yes, you can cancel your subscription at any time. You'll continue to have access
                until the end of your current billing period.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Is my data secure?
              </h4>
              <p className="text-sm text-gray-600">
                Absolutely! We use industry-standard encryption and security practices to protect
                your data. All payments are processed securely through Stripe.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Cancel Subscription</h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
                <InformationCircleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                <p className="text-sm text-yellow-800">
                  Are you sure you want to cancel your subscription?
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="cancelOption"
                    value="period_end"
                    defaultChecked
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">
                    Cancel at the end of the billing period (continue using until then)
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="cancelOption"
                    value="immediately"
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">
                    Cancel immediately (lose access right away)
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="btn btn-outline"
              >
                Keep Subscription
              </button>
              <button
                onClick={() => {
                  const selectedOption = document.querySelector('input[name="cancelOption"]:checked').value;
                  handleCancelSubscription(selectedOption === 'immediately');
                }}
                disabled={isProcessing}
                className="btn btn-secondary"
              >
                {isProcessing ? (
                  <ArrowPathIcon className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  'Cancel Subscription'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingPage;