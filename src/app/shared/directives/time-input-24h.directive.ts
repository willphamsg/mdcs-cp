import {
  Directive,
  ElementRef,
  HostListener,
  Optional,
  Self,
} from '@angular/core';
import { NgControl } from '@angular/forms';

type TimePart = 'hour' | 'minute';

@Directive({
  selector: 'input[appTimeInput24h]',
  standalone: true,
})
export class TimeInput24hDirective {
  private activePart: TimePart = 'hour';
  private buffer: Record<TimePart, string> = {
    hour: '',
    minute: '',
  };

  constructor(
    private elementRef: ElementRef<HTMLInputElement>,
    @Optional() @Self() private ngControl: NgControl
  ) {}

  @HostListener('focus')
  onFocus(): void {
    if (!this.value) {
      this.setValue('00:00');
    }

    this.setActivePart('hour', true);
  }

  @HostListener('click')
  onClick(): void {
    // Requirement: clicking the field starts from hour
    this.setActivePart('hour', true);
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    const input = this.input;

    if (document.activeElement !== input) {
      return;
    }

    const part = this.getPartFromMouse(event);
    this.setActivePart(part, false);
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const allowedKeys = ['Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];

    if (allowedKeys.includes(event.key)) {
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();

      this.buffer[this.activePart] = '';
      this.updatePart(this.activePart, 0);
      this.selectPart(this.activePart);

      return;
    }

    if (!/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      return;
    }

    event.preventDefault();

    let partBuffer = this.buffer[this.activePart] || '';
    partBuffer += event.key;

    if (partBuffer.length > 2) {
      partBuffer = event.key;
    }

    this.buffer[this.activePart] = partBuffer;

    const value = Number(partBuffer);
    this.updatePart(this.activePart, value);

    if (partBuffer.length === 2) {
      this.buffer[this.activePart] = '';

      if (this.activePart === 'hour') {
        this.setActivePart('minute', true);
      } else {
        this.selectPart('minute');
      }
    } else {
      this.selectPart(this.activePart);
    }
  }

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent): void {
    event.preventDefault();

    if (!this.value || !/^\d{2}:\d{2}$/.test(this.value)) {
      this.setValue('00:00');
    }

    const part = this.getPartFromMouse(event);
    this.activePart = part;
    this.buffer[part] = '';

    let [hour, minute] = this.value.split(':').map(Number);

    if (Number.isNaN(hour)) hour = 0;
    if (Number.isNaN(minute)) minute = 0;

    const direction = event.deltaY < 0 ? 1 : -1;

    if (part === 'hour') {
      hour += direction;

      if (hour > 23) hour = 0;
      if (hour < 0) hour = 23;
    } else {
      minute += direction;

      if (minute > 59) {
        minute = 0;
        hour += 1;
        if (hour > 23) hour = 0;
      }

      if (minute < 0) {
        minute = 59;
        hour -= 1;
        if (hour < 0) hour = 23;
      }
    }

    this.setValue(this.formatTime(hour, minute));
    this.selectPart(part);
  }

  @HostListener('blur')
  onBlur(): void {
    if (!this.value || !/^\d{2}:\d{2}$/.test(this.value)) {
      this.setValue('00:00');
      return;
    }

    let [hour, minute] = this.value.split(':').map(Number);

    hour = this.clamp(hour, 0, 23);
    minute = this.clamp(minute, 0, 59);

    this.setValue(this.formatTime(hour, minute));
  }

  private get input(): HTMLInputElement {
    return this.elementRef.nativeElement;
  }

  private get value(): string {
    return this.ngControl?.control?.value || this.input.value || '';
  }

  private setValue(value: string): void {
    this.input.value = value;
    this.ngControl?.control?.setValue(value);
    this.ngControl?.control?.markAsDirty();
  }

  private setActivePart(part: TimePart, resetBuffer: boolean): void {
    this.activePart = part;

    if (resetBuffer) {
      this.buffer[part] = '';
    }

    this.selectPart(part);
  }

  private selectPart(part: TimePart): void {
    setTimeout(() => {
      if (part === 'hour') {
        this.input.setSelectionRange(0, 2);
      } else {
        this.input.setSelectionRange(3, 5);
      }
    });
  }

  private updatePart(part: TimePart, value: number): void {
    let currentValue = this.value || '00:00';

    if (!/^\d{2}:\d{2}$/.test(currentValue)) {
      currentValue = '00:00';
    }

    let [hour, minute] = currentValue.split(':').map(Number);

    if (part === 'hour') {
      hour = this.clamp(value, 0, 23);
    } else {
      minute = this.clamp(value, 0, 59);
    }

    this.setValue(this.formatTime(hour, minute));
  }

  private getPartFromMouse(event: MouseEvent | WheelEvent): TimePart {
    const rect = this.input.getBoundingClientRect();
    const x = event.clientX - rect.left;

    const style = window.getComputedStyle(this.input);
    const paddingLeft = parseFloat(style.paddingLeft || '0');

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (context) {
      context.font = `${style.fontSize} ${style.fontFamily}`;
      const hourAreaWidth = paddingLeft + context.measureText('00:').width;

      return x <= hourAreaWidth ? 'hour' : 'minute';
    }

    return x <= rect.width / 2 ? 'hour' : 'minute';
  }

  private formatTime(hour: number, minute: number): string {
    return `${hour.toString().padStart(2, '0')}:${minute
      .toString()
      .padStart(2, '0')}`;
  }

  private clamp(value: number, min: number, max: number): number {
    if (Number.isNaN(value)) return min;
    return Math.min(Math.max(value, min), max);
  }
}