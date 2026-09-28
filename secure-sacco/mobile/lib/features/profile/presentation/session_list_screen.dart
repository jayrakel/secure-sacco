import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/session_state.dart';
import '../../auth/data/auth_state.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import 'package:intl/intl.dart';

class SessionListScreen extends ConsumerStatefulWidget {
  final bool embedded;
  const SessionListScreen({super.key, this.embedded = false});

  @override
  ConsumerState<SessionListScreen> createState() => _SessionListScreenState();
}

class _SessionListScreenState extends ConsumerState<SessionListScreen> {
  String? _userId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _userId = ref.read(authControllerProvider).userId;
      if (_userId != null) {
        ref.read(sessionControllerProvider.notifier).fetchSessions(_userId!);
      }
    });
  }

  void _revokeAll() {
    if (_userId == null) return;
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Revoke All Sessions'),
        content: const Text('Are you sure you want to log out of all other devices? You will remain logged in on this device if your current session is not revoked by the server, but it is recommended to re-login.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              ref.read(sessionControllerProvider.notifier).revokeAll(_userId!);
            },
            child: const Text('Revoke All', style: TextStyle(color: AppColors.negative)),
          ),
        ],
      ),
    );
  }

  void _revokeSession(String sessionId) {
    if (_userId == null) return;
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Revoke Session'),
        content: const Text('Are you sure you want to end this session?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              ref.read(sessionControllerProvider.notifier).revokeSession(_userId!, sessionId);
            },
            child: const Text('Revoke', style: TextStyle(color: AppColors.negative)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(sessionControllerProvider);

    return Scaffold(
      backgroundColor: widget.embedded ? Colors.transparent : AppColors.background,
      appBar: widget.embedded ? null : AppBar(
        title: const Text('Active Sessions'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.textPrimary),
        actions: [
          if (state.sessions.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.delete_sweep, color: AppColors.negative),
              onPressed: _revokeAll,
              tooltip: 'Revoke All Sessions',
            ),
        ],
      ),
      body: state.isLoading && state.sessions.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : state.error != null && state.sessions.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: AppColors.negative),
                      const SizedBox(height: AppSpacing.sm),
                      Text(state.error!, style: AppTextStyles.bodyMedium),
                      const SizedBox(height: AppSpacing.md),
                      ElevatedButton(
                        onPressed: () {
                          if (_userId != null) {
                            ref.read(sessionControllerProvider.notifier).fetchSessions(_userId!);
                          }
                        },
                        child: const Text('Retry'),
                      )
                    ],
                  ),
                )
              : _buildSessionList(state.sessions),
    );
  }

  Widget _buildSessionList(List<Map<String, dynamic>> sessions) {
    if (sessions.isEmpty) {
      return const Center(child: Text('No active sessions found.'));
    }

    return RefreshIndicator(
      onRefresh: () async {
        if (_userId != null) {
          await ref.read(sessionControllerProvider.notifier).fetchSessions(_userId!);
        }
      },
      child: ListView.builder(
        padding: const EdgeInsets.all(AppSpacing.md),
        itemCount: sessions.length,
        itemBuilder: (context, index) {
          final session = sessions[index];
          final String sessionId = session['sessionId'] ?? 'Unknown Session';
          final String creationTimeStr = session['creationTime'] ?? '';
          final String lastAccessedStr = session['lastAccessedTime'] ?? '';
          
          DateTime? createdDate;
          try {
            if (creationTimeStr.isNotEmpty) createdDate = DateTime.parse(creationTimeStr);
          } catch (_) {}

          DateTime? accessedDate;
          try {
            if (lastAccessedStr.isNotEmpty) accessedDate = DateTime.parse(lastAccessedStr);
          } catch (_) {}

          final createdString = createdDate != null ? DateFormat('MMM dd, yyyy - HH:mm').format(createdDate.toLocal()) : 'Unknown time';
          final accessedString = accessedDate != null ? DateFormat('MMM dd, yyyy - HH:mm').format(accessedDate.toLocal()) : 'Unknown time';
          
          final shortId = sessionId.length > 8 ? sessionId.substring(0, 8) : sessionId;

          return Card(
            margin: const EdgeInsets.only(bottom: AppSpacing.md),
            child: ListTile(
              leading: const Icon(Icons.devices, color: AppColors.primary, size: 32),
              title: Text('Session #$shortId...', style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.bold)),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 4),
                  Text('Created: $createdString', style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary)),
                  Text('Last Active: $accessedString', style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary)),
                ],
              ),
              trailing: IconButton(
                icon: const Icon(Icons.close, color: AppColors.negative),
                onPressed: () => _revokeSession(sessionId),
                tooltip: 'Revoke Session',
              ),
              isThreeLine: true,
            ),
          );
        },
      ),
    );
  }
}
