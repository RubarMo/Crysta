import 'package:flutter/material.dart';
import '../../../widgets/native_text_editor.dart';
import '../../../widgets/step_reference_card.dart';
import '../zen_mode_view.dart';

class StepHeaderActions extends StatelessWidget {
  final bool isDone;
  final ValueChanged<bool> onToggleDone;
  final VoidCallback onSave;
  final VoidCallback? onOpenZenMode;
  final String Function(String) t;
  final bool isMobile;

  const StepHeaderActions({
    super.key,
    required this.isDone,
    required this.onToggleDone,
    required this.onSave,
    this.onOpenZenMode,
    required this.t,
    required this.isMobile,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      alignment: WrapAlignment.end,
      spacing: 8,
      runSpacing: 4,
      children: [
        if (onOpenZenMode != null)
          IconButton(
            onPressed: onOpenZenMode,
            icon: const Icon(Icons.self_improvement, size: 20),
            tooltip: t('zenModeBtn'),
          ),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(t('markAsCompleted'), style: TextStyle(fontSize: isMobile ? 12 : 14)),
            Checkbox(
              value: isDone,
              onChanged: (val) => onToggleDone(val ?? false),
              visualDensity: isMobile ? VisualDensity.compact : null,
            ),
          ],
        ),
        ElevatedButton.icon(
          onPressed: onSave,
          icon: const Icon(Icons.save, size: 16),
          label: Text(t('save')),
          style: ElevatedButton.styleFrom(
            padding: isMobile ? const EdgeInsets.symmetric(horizontal: 12, vertical: 8) : null,
          ),
        ),
      ],
    );
  }
}

class StepEditorTab extends StatelessWidget {
  final String title;
  final String instruction;
  final int referenceStepNum;
  final String referenceText;
  final TextEditingController controller;
  final int stepNum;
  final bool isDone;
  final ValueChanged<bool> onToggleDone;
  final VoidCallback onSave;
  final String Function(String) t;
  final String language;
  final bool isMobile;
  final ValueChanged<String>? onChanged;

  const StepEditorTab({
    super.key,
    required this.title,
    required this.instruction,
    required this.referenceStepNum,
    required this.referenceText,
    required this.controller,
    required this.stepNum,
    required this.isDone,
    required this.onToggleDone,
    required this.onSave,
    required this.t,
    required this.language,
    required this.isMobile,
    this.onChanged,
  });

  void _openZenMode(BuildContext context) {
    ZenModeView.show(
      context,
      title: title,
      controller: controller,
      t: t,
      language: language,
      onChanged: onChanged,
      onSave: onSave,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.all(isMobile ? 12 : 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (isMobile) ...[
            Text(
              title,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            StepHeaderActions(
              isDone: isDone,
              onToggleDone: onToggleDone,
              onSave: onSave,
              onOpenZenMode: () => _openZenMode(context),
              t: t,
              isMobile: true,
            ),
          ] else ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                StepHeaderActions(
                  isDone: isDone,
                  onToggleDone: onToggleDone,
                  onSave: onSave,
                  onOpenZenMode: () => _openZenMode(context),
                  t: t,
                  isMobile: false,
                ),
              ],
            ),
          ],
          const SizedBox(height: 8),
          Text(instruction, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
          const SizedBox(height: 12),
          if (referenceStepNum > 0) ...[
            StepReferenceCard(
              title: '${t('referenceToStep')} $referenceStepNum: ${t('step${referenceStepNum}Title')}',
              referenceText: referenceText,
              language: language,
              t: t,
            ),
            const SizedBox(height: 12),
          ],
          Expanded(
            child: Card(
              margin: EdgeInsets.zero,
              child: NativeTextEditor(
                controller: controller,
                wordCountLabel: t('words'),
                isRtl: language == 'ar',
                onChanged: onChanged,
                onOpenZenMode: () => _openZenMode(context),
                zenModeTooltip: t('zenModeBtn'),
              ),
            ),
          )
        ],
      ),
    );
  }
}
