import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../data/auth_state.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  final _identifierFocusNode = FocusNode();
  final _storage = const FlutterSecureStorage();
  
  bool _isLoading = false;
  String? _errorMessage;
  bool _obscurePassword = true;
  bool _rememberMe = false;

  Map<String, String> _savedAccounts = {};
  List<String> _recentIdentifiers = [];

  @override
  void initState() {
    super.initState();
    _loadSavedCredentials();
  }

  Future<void> _loadSavedCredentials() async {
    final accountsJson = await _storage.read(key: 'saved_accounts_data');
    if (accountsJson != null) {
      try {
        final decoded = jsonDecode(accountsJson) as Map<String, dynamic>;
        _savedAccounts = decoded.map((key, value) => MapEntry(key, value.toString()));
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    final recentsJson = await _storage.read(key: 'recent_identifiers');
    if (recentsJson != null) {
      try {
        final decoded = jsonDecode(recentsJson) as List<dynamic>;
        _recentIdentifiers = decoded.map((e) => e.toString()).toList();
      } catch (e) {
        // Ignore parsing errors
      }
    }

    // Migrate old single-account format if it exists
    final oldId = await _storage.read(key: 'saved_identifier');
    final oldPass = await _storage.read(key: 'saved_password');
    if (oldId != null && oldPass != null) {
      if (!_savedAccounts.containsKey(oldId)) {
        _savedAccounts[oldId] = oldPass;
        _recentIdentifiers.insert(0, oldId);
      }
      await _storage.delete(key: 'saved_identifier');
      await _storage.delete(key: 'saved_password');
      // Save in new format
      await _storage.write(key: 'saved_accounts_data', value: jsonEncode(_savedAccounts));
      await _storage.write(key: 'recent_identifiers', value: jsonEncode(_recentIdentifiers));
    }

    if (_recentIdentifiers.isNotEmpty) {
      setState(() {
        // Do not auto-fill the text fields; let the user select from the dropdown
        // _identifierController.text = _recentIdentifiers.first;
        // _passwordController.text = _savedAccounts[_recentIdentifiers.first] ?? '';
        // _rememberMe = true;
      });
    }
  }

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    _identifierFocusNode.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final id = _identifierController.text.trim();
    final pass = _passwordController.text;

    try {
      await ref.read(authControllerProvider.notifier).login(id, pass);

      if (_rememberMe) {
        _savedAccounts[id] = pass;
        _recentIdentifiers.remove(id);
        _recentIdentifiers.insert(0, id);

        await _storage.write(key: 'saved_accounts_data', value: jsonEncode(_savedAccounts));
        await _storage.write(key: 'recent_identifiers', value: jsonEncode(_recentIdentifiers));
      } else {
        if (_savedAccounts.containsKey(id)) {
          _savedAccounts.remove(id);
          _recentIdentifiers.remove(id);
          await _storage.write(key: 'saved_accounts_data', value: jsonEncode(_savedAccounts));
          await _storage.write(key: 'recent_identifiers', value: jsonEncode(_recentIdentifiers));
        }
      }
    } catch (e) {
      setState(() {
        _errorMessage = "Invalid credentials or network error.";
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Brand Header
                const Icon(
                  Icons.account_balance,
                  size: 64,
                  color: AppColors.primary,
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'Betterlink Connect',
                  textAlign: TextAlign.center,
                  style: AppTextStyles.h1.copyWith(
                    color: AppColors.primaryDark,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Secure SACCO Portal',
                  textAlign: TextAlign.center,
                  style: AppTextStyles.bodyLarge.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: AppSpacing.xxl),

                // Error Message
                if (_errorMessage != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: AppSpacing.lg),
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: AppColors.negative.withAlpha((0.1 * 255).toInt()),
                      borderRadius: BorderRadius.circular(AppSpacing.borderRadiusSm),
                      border: Border.all(color: AppColors.negative.withAlpha((0.3 * 255).toInt())),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline, color: AppColors.negative),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.negative),
                          ),
                        ),
                      ],
                    ),
                  ),

                // Inputs
                LayoutBuilder(
                  builder: (context, constraints) {
                    return RawAutocomplete<String>(
                      textEditingController: _identifierController,
                      focusNode: _identifierFocusNode,
                      optionsBuilder: (TextEditingValue textEditingValue) {
                        final text = textEditingValue.text.trim();
                        if (text.isEmpty) {
                          return _recentIdentifiers.take(5);
                        }
                        return _recentIdentifiers.where((id) => id.toLowerCase().contains(text.toLowerCase()));
                      },
                      onSelected: (String selection) {
                        setState(() {
                          _passwordController.text = _savedAccounts[selection] ?? '';
                          _rememberMe = true;
                        });
                      },
                      fieldViewBuilder: (BuildContext context, TextEditingController textEditingController,
                          FocusNode focusNode, VoidCallback onFieldSubmitted) {
                        return TextField(
                          controller: textEditingController,
                          focusNode: focusNode,
                          decoration: const InputDecoration(
                            labelText: 'Phone, Email, or Member Number',
                            prefixIcon: Icon(Icons.person_outline),
                          ),
                          keyboardType: TextInputType.emailAddress,
                          textInputAction: TextInputAction.next,
                          enabled: !_isLoading,
                        );
                      },
                      optionsViewBuilder: (BuildContext context, AutocompleteOnSelected<String> onSelected, Iterable<String> options) {
                        return Align(
                          alignment: Alignment.topLeft,
                          child: Padding(
                            padding: const EdgeInsets.only(top: 4.0),
                            child: Material(
                              elevation: 4.0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(AppSpacing.borderRadiusSm),
                              ),
                              child: SizedBox(
                                width: constraints.maxWidth,
                                child: ListView.builder(
                                  padding: EdgeInsets.zero,
                                  shrinkWrap: true,
                                  itemCount: options.length,
                                  itemBuilder: (BuildContext context, int index) {
                                    final String option = options.elementAt(index);
                                    return InkWell(
                                      onTap: () => onSelected(option),
                                      child: Padding(
                                        padding: const EdgeInsets.all(AppSpacing.md),
                                        child: Row(
                                          children: [
                                            const Icon(Icons.history, size: 20, color: AppColors.textSecondary),
                                            const SizedBox(width: AppSpacing.sm),
                                            Expanded(
                                              child: Text(option, style: AppTextStyles.bodyMedium),
                                            ),
                                          ],
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    );
                  }
                ),
                const SizedBox(height: AppSpacing.lg),
                TextField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    labelText: 'Password',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword ? Icons.visibility_off : Icons.visibility,
                        color: AppColors.textSecondary,
                      ),
                      onPressed: () {
                        setState(() {
                          _obscurePassword = !_obscurePassword;
                        });
                      },
                    ),
                  ),
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _login(),
                  enabled: !_isLoading,
                ),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    Checkbox(
                      value: _rememberMe,
                      onChanged: _isLoading
                          ? null
                          : (value) {
                              setState(() {
                                _rememberMe = value ?? false;
                              });
                            },
                    ),
                    const Text('Remember Me', style: AppTextStyles.bodyMedium),
                  ],
                ),
                const SizedBox(height: AppSpacing.lg),

                // Login Button
                ElevatedButton(
                  onPressed: _isLoading ? null : _login,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppSpacing.borderRadiusSm),
                    ),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 24,
                          width: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : const Text('Login', style: AppTextStyles.buttonLarge),
                ),
                const SizedBox(height: AppSpacing.lg),

                // Additional Links
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    TextButton(
                      onPressed: () {
                        context.push('/auth/forgot-password');
                      },
                      child: Text(
                        'Forgot Password?',
                        style: AppTextStyles.bodyMedium.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        context.push('/auth/activate');
                      },
                      child: Text(
                        'Activate Account',
                        style: AppTextStyles.bodyMedium.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

