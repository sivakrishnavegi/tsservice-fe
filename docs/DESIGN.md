# Design

A personal utility opened several times a day. It should feel like it came with the iPhone: calm, fast, exact.

## Apple first

- **Native structure.** Native tab bar (Liquid Glass on iOS 26+), per-tab navigation stacks with large titles,
  native toolbar buttons, form sheets with grabbers for editing.
- **Native controls.** `UISegmentedControl`, `UISwitch`, compact and wheel date pickers, action sheets. Don't redraw them.
- **System type.** SF Pro through the system font, Apple's text styles (`core/theme` → `type`). Numbers use tabular figures.
- **System colours.** Grouped background, secondary-label grey, separators; green / red / orange for meal status,
  indigo for breaks. Text on tinted fills uses darker variants in light mode to pass 4.5:1.
- **SF Symbols** for every icon.

## Two modules, two tints

Office is **blue**, Tiffin is **orange**. The tint marks primary actions, toolbar icons and the selected tab,
so you always know which module you're in. App settings stay neutral.

## Every screen answers one question

| Screen | Question |
|---|---|
| Office | How much is left, and when can I leave? |
| Office · History | How did my week or month go? |
| Office · Day sheet | What exactly happened that day? (fix anything) |
| Tiffin | Did today's meals arrive? |
| Tiffin · History | How did this month go? |

## States

Loading = a skeleton shaped like the content. Empty = one sentence and, where useful, one action.
Error = what happened, plus Try again. Validation errors sit directly under the field they're about.

## Motion

Short (160–300 ms), ease-out, springs for anything touch-driven (`core/theme/motion`). Press feedback on every tappable
surface. Enter from near the final state, never from scale 0. Text in the progress ring re-enters on a state change,
not on every tick. Everything honours Reduce Motion. Haptics: medium for check-in/out, light for breaks,
selection for meal and day toggles.
