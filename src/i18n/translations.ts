export type Language = 'en' | 'kn' | 'hi';

export interface Translations {
  // Brand & Header
  brandTitle: string;
  brandTagline: string;
  euRegulation: string;
  dbArchitecture: string;
  supabaseRls: string;
  localDb: string;

  // Nav items
  navDashboard: string;
  navTransfers: string;
  navQpiAI: string;
  navVerify: string;
  navOrganizations: string;
  navMintPassport: string;
  navSettings: string;
  navSignIn: string;
  navSignOut: string;
  scanQrBtn: string;
  collapseSidebar: string;
  expandSidebar: string;
  menu: string;

  // Themes
  themeLight: string;
  themeDark: string;
  themeSystem: string;

  // Languages
  langEn: string;
  langKn: string;
  langHi: string;

  // Dashboard & Fleet
  dashTitle: string;
  dashSubtitle: string;
  kpiTotalPassports: string;
  kpiAvgSoh: string;
  kpiTransfers: string;
  kpiCircularity: string;
  filterAll: string;
  filterActive: string;
  filterSecondLife: string;
  filterEol: string;
  filterTransferred: string;
  searchPassportPlaceholder: string;
  viewDetails: string;
  viewQr: string;
  noPassportsFound: string;

  // Passport Card & Details
  batteryId: string;
  stateOfHealth: string;
  chemistry: string;
  capacity: string;
  voltage: string;
  cycleCount: string;
  carbonFootprint: string;
  carbonScore: string;
  genesisDate: string;
  currentOwner: string;
  custodyStatus: string;
  statusActive: string;
  statusSecondLife: string;
  statusRecycled: string;

  // QR Generation Modal
  qrModalTitle: string;
  qrModalSubtitle: string;
  qrDownloadPng: string;
  qrCopyLink: string;
  qrLinkCopied: string;
  qrPrintSticker: string;
  qrPublicVerify: string;
  qrClose: string;

  // QR Scanner Modal
  scannerTitle: string;
  scannerSubtitle: string;
  scannerCameraTab: string;
  scannerUploadTab: string;
  scannerStartCam: string;
  scannerStopCam: string;
  scannerSwitchCam: string;
  scannerCameraNotice: string;
  scannerCameraDenied: string;
  scannerDropImage: string;
  scannerChooseFile: string;
  scannerAnalyzing: string;
  scannerInvalidCode: string;
  scannerSuccessNotice: string;
  scannerDisclaimerTitle: string;
  scannerDisclaimerText: string;

  // Public Verify Page
  verifyGatewayTitle: string;
  verifyGatewaySubtitle: string;
  verifySearchPlaceholder: string;
  verifyButton: string;
  verifySampleIds: string;
  verifyAuthenticCertificate: string;
  verifyTamperEvidentHash: string;
  verifyGenesisSignature: string;
  verifyPhysicalDisclaimer: string;

  // Auth & Roles
  authSignIn: string;
  authSignUp: string;
  authEmail: string;
  authPassword: string;
  authRole: string;
  authOrg: string;
  authSubmitSignIn: string;
  authSubmitSignUp: string;
  authGuestVerify: string;
  authGuestVerifyDesc: string;
  authBackToSignIn: string;

  // General Actions
  loading: string;
  back: string;
  close: string;
  copied: string;
  error: string;
  success: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // Brand & Header
    brandTitle: 'BatteryPass 360',
    brandTagline: 'Cross-Enterprise Circular Metrology',
    euRegulation: 'EU 2023/1542',
    dbArchitecture: 'Database Architecture',
    supabaseRls: 'Supabase RLS',
    localDb: 'Local DB',

    // Nav items
    navDashboard: 'Dashboard & Fleet',
    navTransfers: 'Custody Transfers',
    navQpiAI: 'QpiAI Quantum & Opt',
    navVerify: 'QR Verification',
    navOrganizations: 'Organizations & RBAC',
    navMintPassport: 'Mint Passport',
    navSettings: 'Settings & Architecture',
    navSignIn: 'Sign In',
    navSignOut: 'Sign Out',
    scanQrBtn: 'Scan QR',
    collapseSidebar: 'Collapse Sidebar',
    expandSidebar: 'Expand Sidebar',
    menu: 'Menu',

    // Themes
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',

    // Languages
    langEn: 'English',
    langKn: 'ಕನ್ನಡ',
    langHi: 'हिन्दी',

    // Dashboard & Fleet
    dashTitle: 'Battery Passport Fleet Metrology',
    dashSubtitle: 'Verified circular economy metrics adhering to European Union Regulation 2023/1542.',
    kpiTotalPassports: 'Total Passports',
    kpiAvgSoh: 'Avg State of Health',
    kpiTransfers: 'Active Transfers',
    kpiCircularity: 'Circularity Index',
    filterAll: 'All Passports',
    filterActive: 'Active Fleet',
    filterSecondLife: 'Second-Life BESS',
    filterEol: 'Recycled / EOL',
    filterTransferred: 'Transferred',
    searchPassportPlaceholder: 'Search by Battery ID, Model, or Serial...',
    viewDetails: 'View Details',
    viewQr: 'QR Sticker',
    noPassportsFound: 'No battery passports match your selected filters.',

    // Passport Card & Details
    batteryId: 'Battery ID',
    stateOfHealth: 'State of Health (SoH)',
    chemistry: 'Cathode Chemistry',
    capacity: 'Nominal Capacity',
    voltage: 'Nominal Voltage',
    cycleCount: 'Cycle Count',
    carbonFootprint: 'Lifecycle Carbon',
    carbonScore: 'Carbon Class',
    genesisDate: 'Genesis Date',
    currentOwner: 'Current Custodian',
    custodyStatus: 'Custody Status',
    statusActive: 'Active Operation',
    statusSecondLife: 'Second-Life BESS',
    statusRecycled: 'Recycled / Materials Recovered',

    // QR Generation Modal
    qrModalTitle: 'Physical Battery QR Code',
    qrModalSubtitle: 'Mandatory QR sticker complying with EU Regulation 2023/1542',
    qrDownloadPng: 'Download PNG',
    qrCopyLink: 'Copy Link',
    qrLinkCopied: 'Link Copied!',
    qrPrintSticker: 'Print Sticker',
    qrPublicVerify: 'Public Verify',
    qrClose: 'Close',

    // QR Scanner Modal
    scannerTitle: 'Scan Battery QR Code',
    scannerSubtitle: 'Verify battery digital passport via camera scan or image upload',
    scannerCameraTab: 'Device Camera',
    scannerUploadTab: 'Upload QR Image',
    scannerStartCam: 'Start Camera',
    scannerStopCam: 'Stop Camera',
    scannerSwitchCam: 'Switch Camera',
    scannerCameraNotice: 'Point your camera directly at the physical battery QR sticker.',
    scannerCameraDenied: 'Camera permission denied or camera not found. Please check browser permissions or upload an image.',
    scannerDropImage: 'Drag & drop a QR image here, or click to browse',
    scannerChooseFile: 'Select QR Image (.png, .jpg, .webp)',
    scannerAnalyzing: 'Analyzing QR code...',
    scannerInvalidCode: 'No valid BatteryPass QR code detected. Please ensure the code is clear and well-lit.',
    scannerSuccessNotice: 'Valid Battery Passport detected!',
    scannerDisclaimerTitle: 'Physical Authenticity Protocol',
    scannerDisclaimerText: 'A QR scan retrieves the authentic digital product passport pointer. Physical pack authenticity is verified through cryptographic SHA-256 hash chains, manufacturer signatures, and immutable BMS telemetry—never through the QR sticker alone.',

    // Public Verify Page
    verifyGatewayTitle: 'Public EV Battery Verification Gateway',
    verifyGatewaySubtitle: 'Official European Union digital product passport portal (EU 2023/1542). Inspect immutable metrology, state of health, and SHA-256 chain-of-custody records.',
    verifySearchPlaceholder: 'Enter Battery ID (e.g. BAT-NMC-8A2F91C0)',
    verifyButton: 'Verify',
    verifySampleIds: 'Sample passport IDs:',
    verifyAuthenticCertificate: 'Certified Authentic Battery Passport',
    verifyTamperEvidentHash: 'Cryptographic SHA-256 Hash Chain',
    verifyGenesisSignature: 'Manufacturer Genesis Signature',
    verifyPhysicalDisclaimer: 'Metrology and authenticity records cryptographically sealed on tamper-evident ledger.',

    // Auth & Roles
    authSignIn: 'Sign In to Enterprise Workspace',
    authSignUp: 'Create Enterprise Account',
    authEmail: 'Corporate Email',
    authPassword: 'Password',
    authRole: 'Select Role Persona',
    authOrg: 'Organization Name',
    authSubmitSignIn: 'Sign In',
    authSubmitSignUp: 'Register Account',
    authGuestVerify: 'Guest QR Verification',
    authGuestVerifyDesc: 'Inspect a physical battery passport without signing in',
    authBackToSignIn: 'Back to Sign In',

    // General Actions
    loading: 'Loading...',
    back: 'Back',
    close: 'Close',
    copied: 'Copied!',
    error: 'Error',
    success: 'Success',
  },

  kn: {
    // Brand & Header
    brandTitle: 'ಬ್ಯಾಟರಿಪಾಸ್ 360',
    brandTagline: 'ಎಂಟರ್‌ಪ್ರೈಸ್ ವೃತ್ತಾಕಾರದ ಬ್ಯಾಟರಿ ಮೆಟ್ರಾಲಜಿ',
    euRegulation: 'EU 2023/1542',
    dbArchitecture: 'ಡೇಟಾಬೇಸ್ ವಿವರಣೆ',
    supabaseRls: 'ಸೂಪಬೇಸ್ RLS',
    localDb: 'ಸ್ಥಳೀಯ ಡೇಟಾಬೇಸ್',

    // Nav items
    navDashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಮತ್ತು ಫ್ಲೀಟ್',
    navTransfers: 'ಮಾಲೀಕತ್ವ ವರ್ಗಾವಣೆ',
    navQpiAI: 'QpiAI ಕ್ವಾಂಟಮ್ ಮತ್ತು ಆಪ್ಟ್',
    navVerify: 'QR ಪರಿಶೀಲನೆ',
    navOrganizations: 'ಸಂಸ್ಥೆಗಳು ಮತ್ತು RBAC',
    navMintPassport: 'ಹೊಸ ಪಾಸ್‌ಪೋರ್ಟ್ ರಚಿಸಿ',
    navSettings: 'ಸೆಟ್ಟಿಂಗ್ಸ್ ಮತ್ತು ಡೇಟಾಬೇಸ್',
    navSignIn: 'ಲಾಗಿನ್',
    navSignOut: 'ಲಾಗ್‌ಔಟ್',
    scanQrBtn: 'QR ಸ್ಕ್ಯಾನ್ ಮಾಡಿ',
    collapseSidebar: 'ಸೈಡ್‌ಬಾರ್ ಮಡಚಿ',
    expandSidebar: 'ಸೈಡ್‌ಬಾರ್ ವಿಸ್ತರಿಸಿ',
    menu: 'ಮೆನು',

    // Themes
    themeLight: 'ಬೆಳಕು (Light)',
    themeDark: 'ಕತ್ತಲೆ (Dark)',
    themeSystem: 'ಸಿಸ್ಟಮ್ (System)',

    // Languages
    langEn: 'English',
    langKn: 'ಕನ್ನಡ',
    langHi: 'हिन्दी',

    // Dashboard & Fleet
    dashTitle: 'ಬ್ಯಾಟರಿ ಪಾಸ್‌ಪೋರ್ಟ್ ಫ್ಲೀಟ್ ಮೆಟ್ರಾಲಜಿ',
    dashSubtitle: 'ಯುರೋಪಿಯನ್ ಒಕ್ಕೂಟದ ನಿಯಮಾವಳಿ 2023/1542 ಪ್ರಕಾರ ಪರಿಶೀಲಿಸಿದ ವೃತ್ತಾಕಾರದ ಆರ್ಥಿಕತೆಯ ವಿವರಗಳು.',
    kpiTotalPassports: 'ಒಟ್ಟು ಪಾಸ್‌ಪೋರ್ಟ್‌ಗಳು',
    kpiAvgSoh: 'ಸರಾಸರಿ ಬ್ಯಾಟರಿ ಆರೋಗ್ಯ (SoH)',
    kpiTransfers: 'ಸಕ್ರಿಯ ವರ್ಗಾವಣೆಗಳು',
    kpiCircularity: 'ವೃತ್ತಾಕಾರದ ಸೂಚ್ಯಂಕ',
    filterAll: 'ಎಲ್ಲಾ ಪಾಸ್‌ಪೋರ್ಟ್‌ಗಳು',
    filterActive: 'ಸಕ್ರಿಯ ಫ್ಲೀಟ್',
    filterSecondLife: 'ದ್ವಿತೀಯ-ಬಳಕೆ (BESS)',
    filterEol: 'ಮರುಬಳಕೆ / ಅಂತ್ಯ',
    filterTransferred: 'ವರ್ಗಾಯಿಸಲಾದವು',
    searchPassportPlaceholder: 'ಬ್ಯಾಟರಿ ID, ಮಾದರಿ ಅಥವಾ ಸರಣಿ ಸಂಖ್ಯೆಯಿಂದ ಹುಡುಕಿ...',
    viewDetails: 'ವಿವರಗಳನ್ನು ವೀಕ್ಷಿಸಿ',
    viewQr: 'QR ಸ್ಟಿಕ್ಕರ್',
    noPassportsFound: 'ಯಾವುದೇ ಬ್ಯಾಟರಿ ಪಾಸ್‌ಪೋರ್ಟ್‌ಗಳು ಹೊಂದಿಕೆಯಾಗುತ್ತಿಲ್ಲ.',

    // Passport Card & Details
    batteryId: 'ಬ್ಯಾಟರಿ ID',
    stateOfHealth: 'ಬ್ಯಾಟರಿ ಆರೋಗ್ಯ (SoH)',
    chemistry: 'ಕ್ಯಾಥೋಡ್ ರಾಸಾಯನಿಕ',
    capacity: 'ಸಾಮರ್ಥ್ಯ (Capacity)',
    voltage: 'ವೋಲ್ಟೇಜ್ (Voltage)',
    cycleCount: 'ಚಕ್ರಗಳ ಸಂಖ್ಯೆ (Cycles)',
    carbonFootprint: 'ಇಂಗಾಲದ ಹೆಜ್ಜೆಗುರುತು',
    carbonScore: 'ಕಾರ್ಬನ್ ವರ್ಗ',
    genesisDate: 'ಉತ್ಪಾದನಾ ದಿನಾಂಕ',
    currentOwner: 'ಪ್ರಸ್ತುತ ಮಾಲೀಕರು',
    custodyStatus: 'ವರ್ಗಾವಣೆ ಸ್ಥಿತಿ',
    statusActive: 'ಸಕ್ರಿಯ ಕಾರ್ಯಾಚರಣೆ',
    statusSecondLife: 'ದ್ವಿತೀಯ-ಬಳಕೆ (BESS)',
    statusRecycled: 'ಮರುಬಳಕೆ ಪೂರ್ಣಗೊಂಡಿದೆ',

    // QR Generation Modal
    qrModalTitle: 'ಭೌತಿಕ ಬ್ಯಾಟರಿ QR ಕೋಡ್',
    qrModalSubtitle: 'EU ನಿಯಮಾವಳಿ 2023/1542 ಕಡ್ಡಾಯ ಡಿಜಿಟಲ್ ಪಾಸ್‌ಪೋರ್ಟ್ ಸ್ಟಿಕ್ಕರ್',
    qrDownloadPng: 'PNG ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ',
    qrCopyLink: 'ಲಿಂಕ್ ನಕಲಿಸಿ',
    qrLinkCopied: 'ಲಿಂಕ್ ನಕಲಿಸಲಾಗಿದೆ!',
    qrPrintSticker: 'ಸ್ಟಿಕ್ಕರ್ ಮುದ್ರಿಸಿ (Print)',
    qrPublicVerify: 'ಸಾರ್ವಜನಿಕ ಪರಿಶೀಲನೆ',
    qrClose: 'ಮುಚ್ಚಿ',

    // QR Scanner Modal
    scannerTitle: 'ಬ್ಯಾಟರಿ QR ಕೋಡ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ',
    scannerSubtitle: 'ಕ್ಯಾಮೆರಾ ಅಥವಾ ಚಿತ್ರದ ಮೂಲಕ ಡಿಜಿಟಲ್ ಪಾಸ್‌ಪೋರ್ಟ್ ಪರಿಶೀಲಿಸಿ',
    scannerCameraTab: 'ಸಾಧನದ ಕ್ಯಾಮೆರಾ',
    scannerUploadTab: 'QR ಚಿತ್ರ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ',
    scannerStartCam: 'ಕ್ಯಾಮೆರಾ ಪ್ರಾರಂಭಿಸಿ',
    scannerStopCam: 'ಕ್ಯಾಮೆರಾ ನಿಲ್ಲಿಸಿ',
    scannerSwitchCam: 'ಕ್ಯಾಮೆರಾ ಬದಲಾಯಿಸಿ',
    scannerCameraNotice: 'ನಿಮ್ಮ ಕ್ಯಾಮೆರಾವನ್ನು ಬ್ಯಾಟರಿ QR ಸ್ಟಿಕ್ಕರ್‌ಗೆ ನೇರವಾಗಿ ಹಿಡಿಯಿರಿ.',
    scannerCameraDenied: 'ಕ್ಯಾಮೆರಾ ಅನುಮತಿ ನಿರಾಕರಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಬ್ರೌಸರ್ ಅನುಮತಿ ಪರಿಶೀಲಿಸಿ ಅಥವಾ ಚಿತ್ರ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.',
    scannerDropImage: 'QR ಚಿತ್ರವನ್ನು ಇಲ್ಲಿ ಎಳೆಯಿರಿ ಅಥವಾ ಬ್ರೌಸ್ ಮಾಡಲು ಕ್ಲಿಕ್ ಮಾಡಿ',
    scannerChooseFile: 'QR ಚಿತ್ರ ಆರಿಸಿ (.png, .jpg, .webp)',
    scannerAnalyzing: 'QR ಕೋಡ್ ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...',
    scannerInvalidCode: 'ಮಾನ್ಯವಾದ ಬ್ಯಾಟರಿ QR ಕೋಡ್ ಕಂಡುಬಂದಿಲ್ಲ. ದಯವಿಟ್ಟು ಸ್ಪಷ್ಟ ಚಿತ್ರವನ್ನು ಬಳಸಿ.',
    scannerSuccessNotice: 'ಮಾನ್ಯವಾದ ಬ್ಯಾಟರಿ ಪಾಸ್‌ಪೋರ್ಟ್ ಪತ್ತೆಯಾಗಿದೆ!',
    scannerDisclaimerTitle: 'ಭೌತಿಕ ಸತ್ಯಾಸತ್ಯತೆ ನಿಯಮ',
    scannerDisclaimerText: 'QR ಕೋಡ್ ಡಿಜಿಟಲ್ ಪಾಸ್‌ಪೋರ್ಟ್ ಲಿಂಕ್ ಒದಗಿಸುತ್ತದೆ. ಬ್ಯಾಟರಿಯ ನಿಜವಾದ ಸುರಕ್ಷತೆಯನ್ನು SHA-256 ಹ್ಯಾಶ್ ಚೈನ್, ಸಹಿಗಳು ಮತ್ತು ಟೆಲಿಮೆಟ್ರಿ ಮೂಲಕ ಮಾತ್ರ ದೃಢೀಕರಿಸಲಾಗುತ್ತದೆ, QR ಕೋಡ್‌ನಿಂದ ಮಾತ್ರವಲ್ಲ.',

    // Public Verify Page
    verifyGatewayTitle: 'ಸಾರ್ವಜನಿಕ EV ಬ್ಯಾಟರಿ ಪರಿಶೀಲನಾ ಪೋರ್ಟಲ್',
    verifyGatewaySubtitle: 'ಅಧಿಕೃತ ಯುರೋಪಿಯನ್ ಒಕ್ಕೂಟದ ಡಿಜಿಟಲ್ ಬ್ಯಾಟರಿ ಪಾಸ್‌ಪೋರ್ಟ್ (EU 2023/1542). ಆರೋಗ್ಯ ಮತ್ತು ಇತಿಹಾಸ ಪರಿಶೀಲಿಸಿ.',
    verifySearchPlaceholder: 'ಬ್ಯಾಟರಿ ID ನಮೂದಿಸಿ (ಉದಾ. BAT-NMC-8A2F91C0)',
    verifyButton: 'ಪರಿಶೀಲಿಸಿ',
    verifySampleIds: 'ಮಾದರಿ ID ಗಳು:',
    verifyAuthenticCertificate: 'ದೃಢೀಕೃತ ಅಧಿಕೃತ ಬ್ಯಾಟರಿ ಪಾಸ್‌ಪೋರ್ಟ್',
    verifyTamperEvidentHash: 'ಕ್ರಿಪ್ಟೋಗ್ರಾಫಿಕ್ SHA-256 ಹ್ಯಾಶ್ ಚೈನ್',
    verifyGenesisSignature: 'ಉತ್ಪಾದಕರ ಡಿಜಿಟಲ್ ಸಹಿ',
    verifyPhysicalDisclaimer: 'ದಾಖಲೆಗಳು ಕ್ರಿಪ್ಟೋಗ್ರಾಫಿಕಲಿ ಸುರಕ್ಷಿತವಾಗಿದ್ದು ಬದಲಾಯಿಸಲಾಗದು.',

    // Auth & Roles
    authSignIn: 'ಎಂಟರ್‌ಪ್ರೈಸ್ ಕಾರ್ಯಸ್ಥಳಕ್ಕೆ ಲಾಗಿನ್ ಆಗಿ',
    authSignUp: 'ಹೊಸ ಖಾತೆ ತೆರೆಯಿರಿ',
    authEmail: 'ಕಾರ್ಪೊರೇಟ್ ಇಮೇಲ್',
    authPassword: 'ಗುಪ್ತಪದ (Password)',
    authRole: 'ಪಾತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    authOrg: 'ಸಂಸ್ಥೆಯ ಹೆಸರು',
    authSubmitSignIn: 'ಲಾಗಿನ್ ಮಾಡಿ',
    authSubmitSignUp: 'ನೋಂದಣಿ ಮಾಡಿ',
    authGuestVerify: 'ಅತಿಥಿ QR ಪರಿಶೀಲನೆ',
    authGuestVerifyDesc: 'ಲಾಗಿನ್ ಆಗದೆ ನೇರವಾಗಿ ಬ್ಯಾಟರಿ ಪಾಸ್‌ಪೋರ್ಟ್ ಪರಿಶೀಲಿಸಿ',
    authBackToSignIn: 'ಲಾಗಿನ್‌ಗೆ ಹಿಂತಿರುಗಿ',

    // General Actions
    loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    back: 'ಹಿಂದೆ',
    close: 'ಮುಚ್ಚಿ',
    copied: 'ನಕಲಿಸಲಾಗಿದೆ!',
    error: 'ದೋಷ',
    success: 'ಯಶಸ್ಸು',
  },

  hi: {
    // Brand & Header
    brandTitle: 'बैटरीपास 360',
    brandTagline: 'एंटरप्राइज सर्कुलर बैटरी मेट्रोलॉजी',
    euRegulation: 'EU 2023/1542',
    dbArchitecture: 'डेटाबेस आर्किटेक्चर',
    supabaseRls: 'सुपाबेस RLS',
    localDb: 'लोकल डेटाबेस',

    // Nav items
    navDashboard: 'डैशबोर्ड और बेड़ा',
    navTransfers: 'स्वामित्व हस्तांतरण',
    navQpiAI: 'QpiAI क्वांटम और ऑप्ट',
    navVerify: 'QR सत्यापन',
    navOrganizations: 'संगठन और RBAC',
    navMintPassport: 'नया पासपोर्ट बनाएं',
    navSettings: 'सेटिंग्स और डेटाबेस',
    navSignIn: 'साइन इन करें',
    navSignOut: 'साइन आउट करें',
    scanQrBtn: 'QR स्कैन करें',
    collapseSidebar: 'साइडबार छोटा करें',
    expandSidebar: 'साइडबार विस्तार करें',
    menu: 'मेनू',

    // Themes
    themeLight: 'लाइट (Light)',
    themeDark: 'डार्क (Dark)',
    themeSystem: 'सिस्टम (System)',

    // Languages
    langEn: 'English',
    langKn: 'ಕನ್ನಡ',
    langHi: 'हिन्दी',

    // Dashboard & Fleet
    dashTitle: 'बैटरी पासपोर्ट बेड़ा मेट्रोलॉजी',
    dashSubtitle: 'यूरोपीय संघ विनियम 2023/1542 के तहत सत्यापित परिपत्र अर्थव्यवस्था मेट्रिक्स।',
    kpiTotalPassports: 'कुल पासपोर्ट',
    kpiAvgSoh: 'औसत बैटरी स्वास्थ्य (SoH)',
    kpiTransfers: 'सक्रिय हस्तांतरण',
    kpiCircularity: 'सर्कुलैरिटी इंडेक्स',
    filterAll: 'सभी पासपोर्ट',
    filterActive: 'सक्रिय बेड़ा',
    filterSecondLife: 'द्वितीय-जीवन (BESS)',
    filterEol: 'पुनर्चक्रण / समाप्त',
    filterTransferred: 'हस्तांतरित',
    searchPassportPlaceholder: 'बैटरी ID, मॉडल या सीरियल नंबर द्वारा खोजें...',
    viewDetails: 'विवरण देखें',
    viewQr: 'QR स्टिकर',
    noPassportsFound: 'कोई बैटरी पासपोर्ट नहीं मिला।',

    // Passport Card & Details
    batteryId: 'बैटरी ID',
    stateOfHealth: 'स्वास्थ्य स्थिति (SoH)',
    chemistry: 'कैथोड रसायन',
    capacity: 'नाममात्र क्षमता',
    voltage: 'नाममात्र वोल्टेज',
    cycleCount: 'साइकिल गणना',
    carbonFootprint: 'जीवनचक्र कार्बन',
    carbonScore: 'कार्बन वर्ग',
    genesisDate: 'उत्पादन तिथि',
    currentOwner: 'वर्तमान मालिक',
    custodyStatus: 'हस्तांतरण स्थिति',
    statusActive: 'सक्रिय संचालन',
    statusSecondLife: 'द्वितीय-जीवन (BESS)',
    statusRecycled: 'पुनर्चक्रित / सामग्री पुनर्प्राप्त',

    // QR Generation Modal
    qrModalTitle: 'भौतिक बैटरी QR कोड',
    qrModalSubtitle: 'EU विनियम 2023/1542 अनिवार्य डिजिटल पासपोर्ट स्टिकर',
    qrDownloadPng: 'PNG डाउनलोड करें',
    qrCopyLink: 'लिंक कॉपी करें',
    qrLinkCopied: 'लिंक कॉपी हो गया!',
    qrPrintSticker: 'स्टिकर प्रिंट करें',
    qrPublicVerify: 'सार्वजनिक सत्यापन',
    qrClose: 'बंद करें',

    // QR Scanner Modal
    scannerTitle: 'बैटरी QR कोड स्कैन करें',
    scannerSubtitle: 'कैमरा स्कैन या इमेज अपलोड द्वारा डिजिटल पासपोर्ट सत्यापित करें',
    scannerCameraTab: 'डिवाइस कैमरा',
    scannerUploadTab: 'QR इमेज अपलोड करें',
    scannerStartCam: 'कैमरा शुरू करें',
    scannerStopCam: 'कैमरा बंद करें',
    scannerSwitchCam: 'कैमरा बदलें',
    scannerCameraNotice: 'अपने कैमरे को बैटरी QR स्टिकर के ठीक सामने रखें।',
    scannerCameraDenied: 'कैमरा अनुमति अस्वीकृत है। कृपया ब्राउज़र अनुमति जांचें या छवि अपलोड करें।',
    scannerDropImage: 'QR इमेज यहां खींचें या फ़ाइल चुनने के लिए क्लिक करें',
    scannerChooseFile: 'QR इमेज चुनें (.png, .jpg, .webp)',
    scannerAnalyzing: 'QR कोड का विश्लेषण हो रहा है...',
    scannerInvalidCode: 'कोई वैध बैटरी QR कोड नहीं मिला। कृपया स्पष्ट छवि अपलोड करें।',
    scannerSuccessNotice: 'वैध बैटरी पासपोर्ट पाया गया!',
    scannerDisclaimerTitle: 'भौतिक प्रामाणिकता प्रोटोकॉल',
    scannerDisclaimerText: 'QR स्कैन डिजिटल पासपोर्ट का लिंक देता है। भौतिक पैक की सत्यता SHA-256 हैश चेन, निर्माता हस्ताक्षर और टेलीमेट्री द्वारा सत्यापित होती है, केवल QR स्टिकर से नहीं।',

    // Public Verify Page
    verifyGatewayTitle: 'सार्वजनिक EV बैटरी सत्यापन पोर्टल',
    verifyGatewaySubtitle: 'आधिकारिक यूरोपीय संघ डिजिटल उत्पाद पासपोर्ट पोर्टल (EU 2023/1542)। स्वास्थ्य और स्वामित्व इतिहास की जांच करें।',
    verifySearchPlaceholder: 'बैटरी ID दर्ज करें (उदा. BAT-NMC-8A2F91C0)',
    verifyButton: 'सत्यापित करें',
    verifySampleIds: 'नमूना पासपोर्ट ID:',
    verifyAuthenticCertificate: 'प्रमाणित प्रामाणिक बैटरी पासपोर्ट',
    verifyTamperEvidentHash: 'क्रिप्टोग्राफ़िक SHA-256 हैश चेन',
    verifyGenesisSignature: 'निर्माता डिजिटल हस्ताक्षर',
    verifyPhysicalDisclaimer: 'मेट्रोलॉजी और प्रामाणिकता रिकॉर्ड क्रिप्टोग्राफ़िक रूप से सुरक्षित हैं।',

    // Auth & Roles
    authSignIn: 'एंटरप्राइज वर्कस्पेस में साइन इन करें',
    authSignUp: 'नया खाता बनाएं',
    authEmail: 'कॉर्पोरेट ईमेल',
    authPassword: 'पासवर्ड',
    authRole: 'भूमिका चुनें',
    authOrg: 'संगठन का नाम',
    authSubmitSignIn: 'साइन इन करें',
    authSubmitSignUp: 'पंजीकरण करें',
    authGuestVerify: 'अतिथि QR सत्यापन',
    authGuestVerifyDesc: 'बिना साइन इन किए सीधे बैटरी पासपोर्ट जांचें',
    authBackToSignIn: 'साइन इन पर वापस जाएं',

    // General Actions
    loading: 'लोड हो रहा है...',
    back: 'पीछे',
    close: 'बंद करें',
    copied: 'कॉपी हुआ!',
    error: 'त्रुटि',
    success: 'सफलता',
  },
};
