import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../auth/data/auth_state.dart';
import '../data/setup_api.dart';
import '../data/setup_controller.dart';
import 'steps/verify_contact_step.dart';
import 'steps/create_officers_step.dart';
import 'steps/configure_platform_step.dart';

class SetupWizardScreen extends ConsumerWidget {
  const SetupWizardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authControllerProvider);
    final user = authState.user;
    final setupStateAsync = ref.watch(setupControllerProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('System Initialization', style: AppTextStyles.h2),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: AppColors.negative),
            onPressed: () {
              ref.read(authControllerProvider.notifier).logout();
              context.go('/login');
            },
          )
        ],
      ),
      body: setupStateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, st) => Center(child: Text('Error: $err')),
        data: (setupState) {
          if (setupState.phase == SetupPhase.COMPLETE) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              context.go('/staff-dashboard');
            });
            return const Center(child: CircularProgressIndicator());
          }

          SetupPhase displayPhase = setupState.phase;
          if (displayPhase == SetupPhase.CHANGE_PASSWORD) {
            displayPhase = SetupPhase.VERIFY_CONTACT;
          }

          return SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Welcome, ${user?['firstName'] ?? 'Admin'}',
                    style: AppTextStyles.h1,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Complete these steps to bring your SACCO online.',
                    style: AppTextStyles.bodyMedium,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32),
                  
                  // Step Indicator
                  _StepIndicator(currentPhase: displayPhase),
                  
                  const SizedBox(height: 32),
                  
                  // Current Step Content
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: _buildCurrentStep(displayPhase, setupState.missingOfficerRoles),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildCurrentStep(SetupPhase phase, List<String> missingRoles) {
    switch (phase) {
      case SetupPhase.VERIFY_CONTACT:
        return const VerifyContactStep();
      case SetupPhase.CREATE_OFFICERS:
        return CreateOfficersStep(missingRoles: missingRoles);
      case SetupPhase.CONFIGURE_PLATFORM:
        return const ConfigurePlatformStep();
      default:
        return const VerifyContactStep();
    }
  }
}

class _StepIndicator extends StatelessWidget {
  final SetupPhase currentPhase;
  
  const _StepIndicator({required this.currentPhase});
  
  @override
  Widget build(BuildContext context) {
    final order = [
      SetupPhase.VERIFY_CONTACT,
      SetupPhase.CREATE_OFFICERS,
      SetupPhase.CONFIGURE_PLATFORM,
      SetupPhase.COMPLETE,
    ];
    
    final currentIndex = order.indexOf(currentPhase);
    
    return Row(
      children: [
        _buildStepItem(0, currentIndex, 'Verify Identity', Icons.phone),
        _buildConnector(0, currentIndex),
        _buildStepItem(1, currentIndex, 'Create Officers', Icons.people),
        _buildConnector(1, currentIndex),
        _buildStepItem(2, currentIndex, 'Configure Platform', Icons.settings),
      ],
    );
  }
  
  Widget _buildStepItem(int stepIndex, int currentIndex, String label, IconData icon) {
    final isDone = stepIndex < currentIndex;
    final isActive = stepIndex == currentIndex;
    
    return Expanded(
      child: Column(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isDone ? AppColors.primary : (isActive ? Colors.white : Colors.white),
              border: Border.all(
                color: isDone || isActive ? AppColors.primary : Colors.grey.shade300,
                width: 2,
              ),
              boxShadow: isActive ? [
                BoxShadow(color: AppColors.primary.withOpacity(0.2), blurRadius: 8, spreadRadius: 2)
              ] : [],
            ),
            child: Icon(
              isDone ? Icons.check : icon,
              color: isDone ? Colors.white : (isActive ? AppColors.primary : Colors.grey.shade400),
              size: 20,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: isActive ? AppColors.primary : (isDone ? AppColors.primary : Colors.grey.shade500),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
  
  Widget _buildConnector(int stepIndex, int currentIndex) {
    final isDone = stepIndex < currentIndex;
    return Expanded(
      child: Container(
        height: 2,
        color: isDone ? AppColors.primary : Colors.grey.shade300,
        margin: const EdgeInsets.only(bottom: 24),
      ),
    );
  }
}
