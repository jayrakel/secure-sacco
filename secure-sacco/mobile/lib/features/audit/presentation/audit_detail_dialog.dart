import 'package:flutter/material.dart';
import '../data/audit_dto.dart';
import 'dart:convert';

class AuditDetailDialog extends StatelessWidget {
  final AuditLogDto log;

  const AuditDetailDialog({Key? key, required this.log}) : super(key: key);

  Widget _buildStateViewer(BuildContext context, String title, String? stateJson) {
    String formattedJson = stateJson ?? 'N/A';
    try {
      if (stateJson != null && stateJson.isNotEmpty) {
        final decoded = jsonDecode(stateJson);
        const encoder = JsonEncoder.withIndent('  ');
        formattedJson = encoder.convert(decoded);
      }
    } catch (_) {
      // If parsing fails, just show the raw string
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
          ),
          child: SelectableText(
            formattedJson,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(fontFamily: 'monospace'),
          ),
        ),
      ],
    );
  }

  Widget _buildInfoRow(BuildContext context, String label, String? value, {bool isMono = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ),
          Expanded(
            child: SelectableText(
              value ?? 'N/A',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontFamily: isMono ? 'monospace' : null,
                  ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    // Determine status color based on result
    Color statusColor = colorScheme.outline;
    if (log.result.toUpperCase().contains('SUCCESS')) {
      statusColor = Colors.green;
    } else if (log.result.toUpperCase().contains('FAIL')) {
      statusColor = Colors.red;
    }

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 800, maxHeight: 800),
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Icon(Icons.security, color: colorScheme.primary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Audit Event Details',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const Divider(height: 32),
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: colorScheme.surfaceContainerHighest.withOpacity(0.5),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        children: [
                          _buildInfoRow(context, 'Timestamp', log.createdAt),
                          _buildInfoRow(context, 'Event Type', log.action),
                          _buildInfoRow(context, 'Actor', log.actor),
                          _buildInfoRow(context, 'Entity Type', log.entityType),
                          _buildInfoRow(context, 'Entity ID', log.entityId),
                          _buildInfoRow(context, 'Target', log.target),
                          _buildInfoRow(context, 'Details', log.details),
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4.0),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                SizedBox(
                                  width: 120,
                                  child: Text(
                                    'Result',
                                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                          fontWeight: FontWeight.bold,
                                          color: colorScheme.onSurfaceVariant,
                                        ),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: statusColor.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(color: statusColor.withOpacity(0.5)),
                                  ),
                                  child: Text(
                                    log.result,
                                    style: TextStyle(
                                      color: statusColor,
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'Technical Context',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    _buildInfoRow(context, 'IP Address', log.ipAddress, isMono: true),
                    _buildInfoRow(context, 'User Agent', log.userAgent, isMono: true),
                    _buildInfoRow(context, 'Session ID', log.sessionId, isMono: true),
                    _buildInfoRow(context, 'Log ID', log.id, isMono: true),
                    
                    if ((log.beforeState != null && log.beforeState!.isNotEmpty) || 
                        (log.afterState != null && log.afterState!.isNotEmpty)) ...[
                      const SizedBox(height: 24),
                      const Divider(),
                      const SizedBox(height: 16),
                      Text(
                        'State Changes',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),
                      LayoutBuilder(
                        builder: (context, constraints) {
                          if (constraints.maxWidth > 600) {
                            // Side by side on larger screens
                            return Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(child: _buildStateViewer(context, 'Before State', log.beforeState)),
                                const SizedBox(width: 16),
                                Expanded(child: _buildStateViewer(context, 'After State', log.afterState)),
                              ],
                            );
                          } else {
                            // Stacked on smaller screens
                            return Column(
                              children: [
                                _buildStateViewer(context, 'Before State', log.beforeState),
                                const SizedBox(height: 16),
                                _buildStateViewer(context, 'After State', log.afterState),
                              ],
                            );
                          }
                        },
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
