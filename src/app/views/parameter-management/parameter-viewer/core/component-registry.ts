import { Bottom1Component } from '@app/views/parameter-management/parameter-viewer/shared/bottom/bottom1/bottom1.component';
import { Bottom2Component } from '@app/views/parameter-management/parameter-viewer/shared/bottom/bottom2/bottom2.component';
import { Top0Component } from '@app/views/parameter-management/parameter-viewer/shared/top/top0/top0.component';
import { Top1Component } from '@app/views/parameter-management/parameter-viewer/shared/top/top1/top1.component';
import { Top3Component } from '@app/views/parameter-management/parameter-viewer/shared/top/top3/top3.component';
import { Middle2Component } from '../shared/middle/middle2/middle2.component';
import { Top2Component } from '../shared/top/top2/top2.component';
import { Bottom4Component } from '../shared/bottom/bottom4/bottom4.component';

export const componentRegistry: { [key: string]: any } = {
  Top0Component,
  Top1Component,
  Top2Component,
  Top3Component,
  Middle2Component,
  Bottom1Component,
  Bottom2Component,
  Bottom4Component,
};
