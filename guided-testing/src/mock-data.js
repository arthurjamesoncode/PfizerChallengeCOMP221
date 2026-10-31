/**
 * Demo data for the mock adapter.
 * Shape mirrors what the real backend should return — see README.md.
 */

export const TESTERS = [
  { id: 't-steve', name: 'Steve', role: 'QA Analyst' },
  { id: 't-bob', name: 'Bob', role: 'QA Analyst' },
  { id: 't-sarah', name: 'Sarah', role: 'QA Lead' },
  { id: 't-priya', name: 'Priya', role: 'Beta Tester' },
];

export const TESTS = [
  {
    id: 'test-101',
    testNumber: 'TC-101',
    name: 'Onboarding smoke test',
    description: 'Verify a brand new user can install, launch and reach the home screen.',
    assignedTo: 't-steve',
    tasks: [
      {
        id: 'task-101-1',
        description: 'Install the app on a clean device and launch it for the first time.',
        expected: 'Splash screen appears for under 3 seconds, then the welcome carousel.',
      },
      {
        id: 'task-101-2',
        description: 'Swipe through all three welcome carousel pages.',
        expected: 'Each page advances with a smooth transition and the dots indicator updates.',
      },
      {
        id: 'task-101-3',
        description: 'Tap "Get started" on the final carousel page.',
        expected: 'The sign-up screen opens with the email field focused.',
      },
      {
        id: 'task-101-4',
        description: 'Force-close the app and relaunch it.',
        expected: 'App opens directly to the sign-up screen and remembers the carousel was completed.',
      },
    ],
  },
  {
    id: 'test-102',
    testNumber: 'TC-102',
    name: 'Login and session handling',
    description: 'Core authentication path including invalid credentials and session restore.',
    assignedTo: 't-steve',
    tasks: [
      {
        id: 'task-102-1',
        description: 'Enter a valid email and password and tap "Log in".',
        expected: 'Spinner shows, then the home dashboard loads within 2 seconds.',
      },
      {
        id: 'task-102-2',
        description: 'Log out, then log back in with an incorrect password.',
        expected: 'Inline error reads "Email or password is incorrect" and the field is cleared.',
      },
      {
        id: 'task-102-3',
        description: 'Tap "Forgot password" and request a reset link for your email.',
        expected: 'Confirmation screen shown; reset email arrives within 60 seconds.',
      },
      {
        id: 'task-102-4',
        description: 'Kill the app, wait 30 seconds, and reopen it while still logged in.',
        expected: 'Session is restored and the dashboard opens without asking for credentials.',
      },
      {
        id: 'task-102-5',
        description: 'Enable airplane mode, then pull to refresh the dashboard.',
        expected: 'A non-blocking "You are offline" banner appears; cached content stays visible.',
      },
    ],
  },
  {
    id: 'test-103',
    testNumber: 'TC-103',
    name: 'Checkout flow',
    description: 'End-to-end purchase with a saved card and an expired card.',
    assignedTo: 't-bob',
    tasks: [
      {
        id: 'task-103-1',
        description: 'Add two items to the cart and open the cart screen.',
        expected: 'Both items are listed with correct prices and a matching subtotal.',
      },
      {
        id: 'task-103-2',
        description: 'Apply promo code "SAVE10".',
        expected: 'Total updates immediately with a 10% discount line item.',
      },
      {
        id: 'task-103-3',
        description: 'Proceed to checkout and pay with the saved card.',
        expected: 'Payment succeeds and an order confirmation screen shows the order number.',
      },
      {
        id: 'task-103-4',
        description: 'Repeat checkout using a card with an expiry date in the past.',
        expected: 'Payment is declined with a clear message and no order is created.',
      },
      {
        id: 'task-103-5',
        description: 'Double-tap the "Pay now" button rapidly.',
        expected: 'Only one charge and one order are created.',
      },
      {
        id: 'task-103-6',
        description: 'Open order history from the confirmation screen.',
        expected: 'The new order appears at the top with status "Processing".',
      },
    ],
  },
  {
    id: 'test-104',
    testNumber: 'TC-104',
    name: 'Push notifications',
    description: 'Permission prompt and delivery of transactional notifications.',
    assignedTo: 't-bob',
    tasks: [
      {
        id: 'task-104-1',
        description: 'Launch the app on a device that has never granted notification permission.',
        expected: 'A permission prompt is shown after the first meaningful action, not on launch.',
      },
      {
        id: 'task-104-2',
        description: 'Trigger a test notification from the debug menu.',
        expected: 'Notification arrives within 10 seconds and opens the correct in-app screen.',
      },
      {
        id: 'task-104-3',
        description: 'Deny notification permission, then trigger a notification again.',
        expected: 'No notification is delivered and the app does not crash or stall.',
      },
    ],
  },
  {
    id: 'test-105',
    testNumber: 'TC-105',
    name: 'Profile editing',
    description: 'Update profile fields, validation and avatar upload.',
    assignedTo: 't-sarah',
    tasks: [
      {
        id: 'task-105-1',
        description: 'Open the profile screen and edit the display name.',
        expected: 'Name field is pre-filled and the save button becomes enabled on change.',
      },
      {
        id: 'task-105-2',
        description: 'Clear the display name and tap save.',
        expected: 'Validation error "Name is required" appears and nothing is saved.',
      },
      {
        id: 'task-105-3',
        description: 'Upload a 5 MB JPEG as the avatar.',
        expected: 'Image is compressed, uploaded and shown in the header within 5 seconds.',
      },
      {
        id: 'task-105-4',
        description: 'Upload a .txt file as the avatar.',
        expected: 'Upload is rejected with "Unsupported file type" and the old avatar remains.',
      },
    ],
  },
  {
    id: 'test-106',
    testNumber: 'TC-106',
    name: 'Offline mode',
    description: 'Behaviour when connectivity drops mid-session.',
    assignedTo: 't-sarah',
    tasks: [
      {
        id: 'task-106-1',
        description: 'Load the dashboard, then disable Wi-Fi and mobile data.',
        expected: 'An offline banner appears within 2 seconds; the UI stays interactive.',
      },
      {
        id: 'task-106-2',
        description: 'Attempt to submit a form while offline.',
        expected: 'The submission is queued with a "Will send when online" notice.',
      },
      {
        id: 'task-106-3',
        description: 'Re-enable connectivity.',
        expected: 'Queued submission is sent automatically and the notice disappears.',
      },
      {
        id: 'task-106-4',
        description: 'Cold-start the app with no connectivity at all.',
        expected: 'App opens to a cached shell with a retry action, not a blank screen.',
      },
    ],
  },
];
