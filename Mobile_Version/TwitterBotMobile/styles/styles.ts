import { StyleSheet, Dimensions } from 'react-native';
import { colors } from '../constants/Colors';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  // Container Styles
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loginContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 16,
  },

  // Card Styles
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  // Header Styles
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  loginHeader: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 22,
  },
  loginSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },

  // Logo Styles
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(29, 161, 242, 0.1)',
    borderRadius: 50,
    alignSelf: 'center',
  },

  // Button Styles
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginVertical: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 8,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  googleIcon: {
    marginRight: 12,
  },

  // Input Styles
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },

  // Status Styles
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusActive: {
    backgroundColor: 'rgba(23, 191, 99, 0.1)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusMessage: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusSuccess: {
    backgroundColor: 'rgba(23, 191, 99, 0.1)',
  },
  statusError: {
    backgroundColor: 'rgba(224, 36, 94, 0.1)',
  },
  statusInfo: {
    backgroundColor: 'rgba(29, 161, 242, 0.1)',
  },
  statusMessageText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Note Styles
  loginNote: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(225, 232, 237, 0.3)',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noteIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  noteTextContainer: {
    flex: 1,
  },
  noteText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
});