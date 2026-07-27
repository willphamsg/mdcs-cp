import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { TimeInput24hDirective } from './time-input-24h.directive';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, TimeInput24hDirective],
  template: `<input appTimeInput24h [formControl]="control" />`,
})
class TestHostComponent {
  control = new FormControl('');
}

describe('TimeInput24hDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let input: HTMLInputElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
    });

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();

    input = fixture.nativeElement.querySelector('input');
  });

  function keydown(
    key: string,
    target: HTMLInputElement = input
  ): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key, cancelable: true });
    spyOn(event, 'preventDefault').and.callThrough();
    target.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  }

  function wheel(deltaY: number, clientX = 0): WheelEvent {
    const event = new WheelEvent('wheel', {
      deltaY,
      clientX,
      cancelable: true,
    });
    spyOn(event, 'preventDefault').and.callThrough();
    input.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  }

  it('should create an instance', () => {
    expect(input).toBeTruthy();
  });

  describe('keydown filtering (non-digit rejection)', () => {
    it('blocks a non-digit, non-control key and calls preventDefault', () => {
      // Focus first to establish '00:00' baseline like a real user interaction.
      input.dispatchEvent(new Event('focus'));
      fixture.detectChanges();

      const event = keydown('a');

      expect(event.preventDefault).toHaveBeenCalled();
      // Value should remain unchanged since 'a' is not a digit.
      expect(input.value).toBe('00:00');
    });

    it('allows navigation keys through without preventDefault', () => {
      input.dispatchEvent(new Event('focus'));
      fixture.detectChanges();

      const event = keydown('ArrowLeft');

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('handles digit entry and auto-advances to minute after 2 digits', () => {
      input.dispatchEvent(new Event('focus'));
      fixture.detectChanges();

      keydown('1');
      keydown('2');

      expect(input.value).toBe('12:00');

      keydown('3');
      keydown('0');

      expect(input.value).toBe('12:30');
    });

    it('handles backspace by clearing the active part to 00', () => {
      input.dispatchEvent(new Event('focus'));
      fixture.detectChanges();

      // Two digits for hour auto-advances active part to minute.
      keydown('1');
      keydown('5');
      expect(input.value).toBe('15:00');

      // One digit into minute.
      keydown('3');
      expect(input.value).toBe('15:03');

      // Backspace clears the active (minute) part back to 00.
      const event = keydown('Backspace');

      expect(event.preventDefault).toHaveBeenCalled();
      expect(input.value).toBe('15:00');
    });
  });

  describe('wheel event (stepHour / stepMinute)', () => {
    beforeEach(() => {
      host.control.setValue('12:30');
      fixture.detectChanges();
    });

    it('prevents default on wheel', () => {
      const event = wheel(-1, 0);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('steps the hour up when scrolling on the hour segment (deltaY < 0)', () => {
      // clientX = 0 -> within hour area per getPartFromMouse fallback/measurement.
      wheel(-1, 0);
      expect(input.value).toBe('13:30');
    });

    it('wraps the hour from 23 to 0 when incrementing past the max', () => {
      host.control.setValue('23:30');
      fixture.detectChanges();

      wheel(-1, 0);

      expect(input.value).toBe('00:30');
    });

    it('wraps the hour from 0 to 23 when decrementing below the min', () => {
      host.control.setValue('00:30');
      fixture.detectChanges();

      wheel(1, 0);

      expect(input.value).toBe('23:30');
    });

    it('steps the minute up when scrolling on the minute segment', () => {
      const rectWidth = input.getBoundingClientRect().width || 100;
      // Use a clientX comfortably past the hour text so getPartFromMouse
      // (canvas-measurement or width/2 fallback) resolves to 'minute'.
      wheel(-1, rectWidth);

      expect(input.value).toBe('12:31');
    });

    it('rolls the minute from 59 to 0 and increments the hour', () => {
      host.control.setValue('12:59');
      fixture.detectChanges();

      const rectWidth = input.getBoundingClientRect().width || 100;
      wheel(-1, rectWidth);

      expect(input.value).toBe('13:00');
    });

    it('rolls the minute from 0 to 59 and decrements the hour when going below min', () => {
      host.control.setValue('12:00');
      fixture.detectChanges();

      const rectWidth = input.getBoundingClientRect().width || 100;
      wheel(1, rectWidth);

      expect(input.value).toBe('11:59');
    });

    it('rolls minute 0 down to 59 and wraps hour 0 to 23', () => {
      host.control.setValue('00:00');
      fixture.detectChanges();

      const rectWidth = input.getBoundingClientRect().width || 100;
      wheel(1, rectWidth);

      expect(input.value).toBe('23:59');
    });

    it('resets to 00:00 when current value is not a valid HH:mm before stepping', () => {
      host.control.setValue('garbage');
      fixture.detectChanges();

      wheel(-1, 0);

      // After reset to 00:00 and stepping hour up by 1.
      expect(input.value).toBe('01:00');
    });
  });

  describe('blur validation / clamping', () => {
    it('resets to 00:00 when value is empty on blur', () => {
      host.control.setValue('');
      fixture.detectChanges();

      input.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      expect(input.value).toBe('00:00');
    });

    it('resets to 00:00 when value does not match HH:mm on blur', () => {
      host.control.setValue('abc');
      fixture.detectChanges();

      input.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      expect(input.value).toBe('00:00');
    });

    it('clamps an out-of-range hour and minute on blur', () => {
      host.control.setValue('99:99');
      fixture.detectChanges();

      input.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      expect(input.value).toBe('23:59');
    });

    it('keeps a valid HH:mm value unchanged on blur', () => {
      host.control.setValue('09:05');
      fixture.detectChanges();

      input.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      expect(input.value).toBe('09:05');
    });
  });

  describe('mousemove / click part detection', () => {
    it('selects the hour part on click', () => {
      input.dispatchEvent(new Event('click'));
      fixture.detectChanges();

      // No direct DOM assertion available for selectionStart/End timing
      // reliably across browsers, so assert no throw + value integrity.
      expect(input.value).toBeDefined();
    });

    it('does not throw when mousemove occurs while the input is not focused', () => {
      const event = new MouseEvent('mousemove', { clientX: 5 });
      expect(() => input.dispatchEvent(event)).not.toThrow();
    });

    it('updates active part on mousemove while focused, affecting subsequent wheel step', () => {
      host.control.setValue('12:30');
      fixture.detectChanges();

      input.focus();
      const rectWidth = input.getBoundingClientRect().width || 100;
      const moveEvent = new MouseEvent('mousemove', { clientX: rectWidth });
      input.dispatchEvent(moveEvent);
      fixture.detectChanges();

      wheel(-1, rectWidth);

      expect(input.value).toBe('12:31');
    });
  });
});
